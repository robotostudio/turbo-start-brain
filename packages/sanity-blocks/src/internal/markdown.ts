/**
 * Shared helpers and types for page-builder Markdown serialization.
 * Block-level serializers (co-located in each block's directory) import from
 * here to stay DRY and avoid circular dependencies with the dispatcher.
 */

import {
  escapeMarkdown,
  type MarkdownImage,
  type MarkdownOptions,
  type PortableTextValue,
} from "./portable-text-to-markdown";

export type { MarkdownImage, MarkdownOptions, PortableTextValue };

export interface MarkdownFaq {
  _key?: string | null;
  _id?: string;
  title?: string | null;
  richText?: PortableTextValue;
}

export interface MarkdownBlock {
  _type?: string;
  _key?: string;
  title?: string | null;
  eyebrow?: string | null;
  description?: string | null;
  subtitle?: string | null;
  richText?: PortableTextValue;
  faqs?: MarkdownFaq[] | null;
}

/** Joins defined, non-empty sections with a blank line between them. */
export function joinSections(
  sections: Array<string | null | undefined>
): string {
  return sections.filter((section) => section?.trim()).join("\n\n");
}

export function eyebrowToMarkdown(eyebrow?: string | null): string {
  const text = eyebrow?.trim().replace(/\s+/g, " ");
  return text ? `**${escapeMarkdown(text)}**` : "";
}

export function headingToMarkdown(
  title: string | null | undefined,
  level: 2 | 3
): string {
  const text = title?.trim().replace(/\s+/g, " ");
  return text ? `${"#".repeat(level)} ${escapeMarkdown(text)}` : "";
}
