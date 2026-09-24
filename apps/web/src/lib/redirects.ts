import { Logger } from "@workspace/logger";
import { sanityFetch } from "@workspace/sanity/live";
import { queryRedirects } from "@workspace/sanity/query";

import { normalizeMarkdownPath } from "./markdown-path";

/**
 * The one authoritative resolver for Sanity `redirect` documents.
 *
 * Both surfaces call it — HTML navigation (the `[...slug]` catch-all, just
 * before `notFound()`) and Markdown negotiation (`/api/markdown`) — so an
 * editor publishing a redirect changes both at the same moment. It is
 * deliberately *not* `next.config.ts`'s `redirects()`: that snapshot is taken
 * once at build time, so it went stale until the next deploy and disagreed
 * with the runtime `.md` path.
 *
 * Freshness comes from the `'use cache'` + sync-tag plumbing in
 * `@workspace/sanity/live` — the cache entry carries the query's Sanity sync
 * tags, so the `/api/revalidate-sync-tags` webhook invalidates it on publish
 * instead of Sanity being hit per request.
 */

const logger = new Logger("Redirects");

type ResolvedRedirect = {
  /** Verbatim from Sanity: an internal path or an absolute external URL. */
  destination: string;
  permanent: boolean;
};

async function loadRedirects() {
  "use cache";
  try {
    const { data } = await sanityFetch({
      query: queryRedirects,
      perspective: "published",
      stega: false,
    });
    return data ?? [];
  } catch (error) {
    logger.error("Error fetching redirects — resolving as no redirect", error);
    return [];
  }
}

/** Matches on the canonical form of the path, so `/a/`, `/a` and `/a.md` agree. */
export async function resolveRedirect(
  path: string
): Promise<ResolvedRedirect | null> {
  const source = normalizeMarkdownPath(path);
  const redirects = await loadRedirects();
  const match = redirects.find(
    (redirect) =>
      redirect.source && normalizeMarkdownPath(redirect.source) === source
  );
  if (!match?.destination) {
    return null;
  }
  return {
    destination: match.destination,
    permanent: match.permanent ?? false,
  };
}
