import { type DynamicFetchOptions, sanityFetch } from "@workspace/sanity/live";
import { queryCorpusDocs, queryDocsIndex } from "@workspace/sanity/query";
import { cacheLife } from "next/cache";

import { type MarkdownDocument, pageToMarkdown } from "@/lib/markdown";

/**
 * Thrown when the corpus cannot be assembled. The chat route must fail closed
 * on this (503) — answering without the corpus would let the model improvise
 * over an empty knowledge base, which is worse than an error.
 */
export class CorpusUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CorpusUnavailableError";
  }
}

// Published + stega off: stega would thread invisible characters through every
// string, breaking the byte-stable prefix that prompt caching depends on.
const PUBLISHED: DynamicFetchOptions = {
  perspective: "published",
  stega: false,
};

const CORPUS_PREAMBLE =
  "The complete documentation corpus follows. Each document starts with a `=== /slug — Title ===` line; that slug path is the page's URL — cite pages with it.";

type CorpusDoc = MarkdownDocument & { slug?: string | null };

function documentEnvelope(slug: string, doc: MarkdownDocument): string {
  const title = doc.title?.trim() || slug;
  const markdown = pageToMarkdown(doc).trim();
  return `=== ${slug} — ${title} ===\n\n${markdown}`;
}

/**
 * Every published, non-hidden doc (plus the docs index as `/`) rendered to one
 * deterministic Markdown string, slug-ascending. Cached for hours; the Sanity
 * sync tags that `sanityFetch` registers on this entry mean the
 * `/api/revalidate-sync-tags` webhook rebuilds it on publish, so the TTL is
 * only a backstop. Nothing volatile may enter the output — the string is a
 * prompt-cache prefix, and a single changed byte invalidates everything after
 * it.
 */
export async function getDocsCorpus(): Promise<string> {
  "use cache";
  cacheLife("hours");

  let index: unknown;
  let docs: unknown[] | null;
  try {
    [{ data: index }, { data: docs }] = await Promise.all([
      sanityFetch({ query: queryDocsIndex, ...PUBLISHED }),
      sanityFetch({ query: queryCorpusDocs, ...PUBLISHED }),
    ]);
  } catch (error) {
    throw new CorpusUnavailableError("Corpus fetch failed", { cause: error });
  }

  const sections: string[] = [];
  if (index) {
    sections.push(documentEnvelope("/", index as MarkdownDocument));
  }
  for (const doc of (docs ?? []) as CorpusDoc[]) {
    if (doc.slug) {
      sections.push(documentEnvelope(`/${doc.slug}`, doc));
    }
  }

  if (sections.length === 0) {
    throw new CorpusUnavailableError("Corpus query returned no documents");
  }

  return `${CORPUS_PREAMBLE}\n\n${sections.join("\n\n")}\n`;
}
