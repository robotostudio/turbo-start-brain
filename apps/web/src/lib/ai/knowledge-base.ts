import { createMCPClient } from "@ai-sdk/mcp";
import { type DynamicFetchOptions, sanityFetch } from "@workspace/sanity/live";
import { queryDocsIndex } from "@workspace/sanity/query";
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

// Published + stega off: stega threads invisible characters through every
// string, which would break the byte-stable cached prefix.
const PUBLISHED: DynamicFetchOptions = {
  perspective: "published",
  stega: false,
};

const PAGE_INDEX_PREAMBLE =
  "Every page on this site, as `/slug — Title` (a description follows where the page has one). These slugs are the only link targets that exist — the Knowledge Base entries you read are keyed by their own paths, which are NOT site URLs and must never be linked.";

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

  if (lines.length === 0) {
    throw new PageIndexUnavailableError("Page index query returned no pages");
  }

  return `${PAGE_INDEX_PREAMBLE}\n\n${lines.join("\n")}\n`;
}

/**
 * Connects to the Sanity Context endpoint serving the docs Knowledge Base. In
 * Knowledge Base mode it offers two tools: `initial_context` (the outline,
 * which names the Knowledge Base id) and `knowledge_base_read`.
 *
 * The caller must `close()` the client, or the connection outlives the request.
 */
export function connectKnowledgeBase(url: string, token: string) {
  return createMCPClient({
    transport: {
      type: "http",
      url,
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}
