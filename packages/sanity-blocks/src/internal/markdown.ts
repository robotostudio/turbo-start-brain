/**
 * Shared helpers and types for page-builder Markdown serialization.
 * Block-level serializers (co-located in each block's directory) import from
 * here to stay DRY and avoid circular dependencies with the dispatcher.
 */

import {
  absolutizeUrl,
  escapeMarkdown,
  formatUrl,
  type MarkdownImage,
  type MarkdownOptions,
  type PortableTextValue,
} from "./portable-text-to-markdown";

export type { MarkdownImage, MarkdownOptions, PortableTextValue };

export interface MarkdownButton {
  _key?: string | null;
  text?: string | null;
  href?: string | null;
}

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
  buttons?: MarkdownButton[] | null;
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

export function buttonsToMarkdown(
  buttons?: MarkdownButton[] | null,
  options: MarkdownOptions = {}
): string {
  if (!Array.isArray(buttons)) {
    return "";
  }

  return buttons
    .map((button) => {
      const text = (button.text ?? "").trim();
      const href = button.href;
      if (href && href !== "#") {
        const url = formatUrl(absolutizeUrl(href, options.baseUrl));
        return `- [${escapeMarkdown(text || href)}](${url})`;
      }
      return text ? `- ${escapeMarkdown(text)}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

export function imageToMarkdown(
  image: MarkdownImage | null | undefined,
  options: MarkdownOptions
): string {
  const alt = (image?.alt ?? "").trim();
  const caption = (image?.caption ?? "").trim();
  const url = image?.id ? options.resolveImageUrl?.(image) : undefined;
  // Mirror portable-text: image when a URL resolves, else caption/alt text.
  if (url) {
    const img = `![${escapeMarkdown(alt)}](${formatUrl(url)})`;
    return caption && caption !== alt
      ? `${img}\n\n_${escapeMarkdown(caption)}_`
      : img;
  }
  return escapeMarkdown(caption || alt);
}
