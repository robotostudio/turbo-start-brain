import { createMCPClient } from "@ai-sdk/mcp";
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
  try {
    // Published + stega off: stega threads invisible characters through every
    // string, which would break the cached prefix.
    const tree = await getDocsNavigation({
      perspective: "published",
      stega: false,
    });
    pages = flattenDocsTree(tree);
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
