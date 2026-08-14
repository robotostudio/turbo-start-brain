import { Logger } from "@workspace/logger";
import {
  type DynamicFetchOptions,
  getDynamicFetchOptions,
  sanityFetch,
} from "@workspace/sanity/live";
import {
  queryDocBySlug,
  queryDocsIndex,
  queryRedirects,
} from "@workspace/sanity/query";
import { draftMode } from "next/headers";

import { type MarkdownDocument, pageToMarkdown } from "@/lib/markdown";
import { normalizeMarkdownPath } from "@/lib/markdown-path";

const logger = new Logger("MarkdownRoute");
const PUBLISHED: DynamicFetchOptions = {
  perspective: "published",
  stega: false,
};

async function buildMarkdown(
  path: string,
  options: DynamicFetchOptions
): Promise<string | null> {
  "use cache";
  const query = path === "/" ? queryDocsIndex : queryDocBySlug;
  const { data } = await sanityFetch({
    query,
    params: path === "/" ? undefined : { slug: path },
    ...options,
  });
  return data ? pageToMarkdown(data as MarkdownDocument) : null;
}

async function findRedirect(path: string) {
  "use cache";
  const { data } = await sanityFetch({ query: queryRedirects, ...PUBLISHED });
  return (data ?? []).find((redirect) => redirect.source === path) ?? null;
}

async function resolveFetchOptions(): Promise<DynamicFetchOptions> {
  const { isEnabled } = await draftMode();
  return isEnabled
    ? { ...(await getDynamicFetchOptions()), stega: false }
    : PUBLISHED;
}

function readForwardedPath(request: Request, url: URL): string {
  const header = request.headers.get("x-markdown-path");
  if (!header) {
    return url.searchParams.get("path") ?? "/";
  }
  try {
    return decodeURIComponent(header);
  } catch {
    return header;
  }
}

function representationOf(path: string): string {
  return path === "/" ? "/index.md" : `${path}.md`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = normalizeMarkdownPath(readForwardedPath(request, url));
  const options = await resolveFetchOptions();

  try {
    const markdown = await buildMarkdown(path, options);
    if (markdown) {
      return new Response(markdown, {
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          vary: "Accept",
          "content-location": representationOf(path),
          "x-robots-tag": "noindex, nofollow",
          "x-content-type-options": "nosniff",
          "cache-control":
            options.perspective === "published"
              ? "public, s-maxage=60, stale-while-revalidate=300"
              : "private, no-store",
        },
      });
    }

    const redirect = await findRedirect(path);
    if (redirect) {
      const target = new URL(redirect.destination, url);
      if (target.origin === url.origin) {
        const normalized = normalizeMarkdownPath(target.pathname);
        target.pathname = representationOf(normalized);
        return Response.redirect(target, redirect.permanent ? 308 : 307);
      }
    }
  } catch (error) {
    logger.error("Markdown build failed", error);
    return new Response("Upstream content fetch failed\n", { status: 503 });
  }

  return new Response(`Not found: ${representationOf(path)}\n`, {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
