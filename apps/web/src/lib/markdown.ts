import { env } from "@workspace/env/client";
import { urlFor } from "@workspace/sanity/client";
import type {
  QueryDocBySlugResult,
  QueryDocsIndexResult,
} from "@workspace/sanity/types";
import {
  type MarkdownBlock,
  pageBuilderToMarkdown,
} from "@workspace/sanity-blocks/internal/page-builder-to-markdown";
import {
  escapeMarkdown,
  type MarkdownOptions,
  type PortableTextValue,
  portableTextToMarkdown,
} from "@workspace/sanity-blocks/internal/portable-text-to-markdown";

const BASE_URL = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const resolveImageUrl: NonNullable<
  MarkdownOptions["resolveImageUrl"]
> = (image) => {
  if (!image?.id) {
    return null;
  }
  try {
    return urlFor(image.id).width(1600).url();
  } catch {
    return null;
  }
};

const markdownOptions: MarkdownOptions = { resolveImageUrl, baseUrl: BASE_URL };

// `_type` is omitted before intersecting: the two result types carry
// incompatible `_type` literals ("doc" vs "docsIndex"), which would reduce
// the whole intersection to `never`.
export type MarkdownDocument = Partial<
  Omit<NonNullable<QueryDocBySlugResult>, "_type"> &
    Omit<NonNullable<QueryDocsIndexResult>, "_type">
>;

function documentHeader(doc: MarkdownDocument): string {
  const title = doc.title?.trim();
  const description = doc.description?.trim();
  return [
    title ? `# ${escapeMarkdown(title)}` : "",
    description ? escapeMarkdown(description) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function pageToMarkdown(doc: MarkdownDocument): string {
  const sections = [
    documentHeader(doc),
    portableTextToMarkdown(
      (doc.body ?? doc.intro) as PortableTextValue,
      markdownOptions
    ),
    pageBuilderToMarkdown(
      doc.pageBuilder as MarkdownBlock[] | null | undefined,
      markdownOptions
    ),
  ];
  const body = sections.filter((section) => section.trim()).join("\n\n");
  return body ? `${body}\n` : "";
}
