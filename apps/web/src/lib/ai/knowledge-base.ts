import { createMCPClient } from "@ai-sdk/mcp";
import { type DynamicFetchOptions, sanityFetch } from "@workspace/sanity/live";
import { queryDocsIndex } from "@workspace/sanity/query";
import type { ToolSet } from "ai";
import { cacheLife } from "next/cache";

import { flattenDocsTree, getDocsNavigation } from "@/lib/docs-tree";

/**
 * Thrown when the page index cannot be assembled. The chat route fails closed
 * on this (503): without it the model has no slugs to link, and an answer with
 * no way back to the page it came from is worse than an error.
 */
export class PageIndexUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PageIndexUnavailableError";
  }
}

export class OutlineUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "OutlineUnavailableError";
  }
}

// Published + stega off: stega threads invisible characters through every
// string, which would break the byte-stable cached prefix.
const PUBLISHED: DynamicFetchOptions = {
  perspective: "published",
  stega: false,
};

const PAGE_INDEX_PREAMBLE =
  "Every page on this site, as `/slug — Title` (a description follows where the page has one). These slugs are the only link targets that exist — the Knowledge Base entries you read are keyed by their own paths, which are NOT site URLs and must never be linked.";

const OUTLINE_PREAMBLE =
  "The Knowledge Base outline follows — its id, every entry path, and what each entry covers. This is the `initial_context` payload, already fetched, so never ask for it. Pick the entry paths that fit the question and read them with `knowledge_base_read`.";

// Long enough for a cold Sanity fetch, short enough that a stalled endpoint
// fails before the 30s function budget is spent waiting on it.
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * The link table, not the knowledge: answers come from the Knowledge Base
 * tools, every href comes from here. Byte-stable — it sits inside the
 * prompt-cache prefix, so nothing volatile may enter the output.
 */
export async function getDocsPageIndex(): Promise<string> {
  "use cache";
  cacheLife("hours");

  let pages: ReturnType<typeof flattenDocsTree>;
  let index: unknown;
  try {
    const [tree, { data }] = await Promise.all([
      getDocsNavigation(PUBLISHED),
      sanityFetch({ query: queryDocsIndex, ...PUBLISHED }),
    ]);
    pages = flattenDocsTree(tree);
    index = data;
  } catch (error) {
    throw new PageIndexUnavailableError("Page index fetch failed", {
      cause: error,
    });
  }

  const lines = pages
    .map((page) => {
      const description = page.description?.trim();
      return `${page.slug} — ${page.title}${description ? ` — ${description}` : ""}`;
    })
    .sort();

  // The docs index is a `docsIndex` singleton, not a `doc`, so `queryDocsTree`
  // never sees it — without this line the site root has no link.
  const indexTitle = (index as { title?: string } | null)?.title?.trim();
  if (indexTitle) {
    lines.unshift(`/ — ${indexTitle}`);
  }

  // Guard on `pages`, not `lines`: the index title alone would satisfy a
  // `lines` check and ship a page index whose only link is the site root.
  if (pages.length === 0) {
    throw new PageIndexUnavailableError("Page index query returned no pages");
  }

  return `${PAGE_INDEX_PREAMBLE}\n\n${lines.join("\n")}\n`;
}

/**
 * The `initial_context` payload over plain HTTP, so its ~80KB rides in the
 * cached prompt prefix instead of a tool call per conversation.
 */
export async function getKnowledgeBaseOutline(
  url: string,
  token: string
): Promise<string> {
  "use cache";
  cacheLife("hours");

  let response: Response;
  try {
    response = await fetch(`${url}/initial-context`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS),
    });
  } catch (error) {
    throw new OutlineUnavailableError("Outline fetch failed", { cause: error });
  }
  if (!response.ok) {
    throw new OutlineUnavailableError(
      `Outline fetch returned ${response.status}`
    );
  }

  const outline = (await response.text()).trim();
  if (!outline) {
    throw new OutlineUnavailableError("Outline fetch returned an empty body");
  }
  return `${OUTLINE_PREAMBLE}\n\n${outline}\n`;
}

/** The only tool the model is given. Anything else the endpoint advertises —
 * GROQ mode serves four — is dropped rather than handed an org-scoped token. */
const ALLOWED_TOOL = "knowledge_base_read";

/** Only what the route uses. Naming the client's own type would drag a
 * non-portable path into the declaration. */
type KnowledgeBaseConnection = {
  client: { close: () => Promise<void> };
  tools: ToolSet;
};

/**
 * Connects and returns only the entry-reading tool — `initial_context` is
 * absent because `getKnowledgeBaseOutline` already supplied its payload.
 *
 * Rejects rather than hanging on a stalled endpoint, closing the client on that
 * path. The caller must `close()` it on every other path.
 */
export async function connectKnowledgeBase(
  url: string,
  token: string
): Promise<KnowledgeBaseConnection> {
  const client = await createMCPClient({
    transport: {
      type: "http",
      url,
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  try {
    const discovered = await Promise.race([
      client.tools(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timed out listing Knowledge Base tools")),
          CONNECT_TIMEOUT_MS
        )
      ),
    ]);

    const read = discovered[ALLOWED_TOOL];
    if (!read) {
      throw new Error(`Endpoint does not serve ${ALLOWED_TOOL}`);
    }
    return { client, tools: { [ALLOWED_TOOL]: read } };
  } catch (error) {
    // Connected by this point, so a failure here leaks the transport.
    await client.close().catch(() => {
      // Already failing; the close error would only mask the real cause.
    });
    throw error;
  }
}
