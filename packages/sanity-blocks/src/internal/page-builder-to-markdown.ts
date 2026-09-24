/** Thin dispatcher: each block's Markdown serializer is co-located in its block
 * directory (add a `case` + `markdown.ts` for new blocks). Unknown types return "". */

import { faqAccordionToMarkdown } from "../faq-accordion/markdown";
import { richTextBlockToMarkdown } from "../rich-text-block/markdown";
import type { MarkdownBlock, MarkdownOptions } from "./markdown";

export type { MarkdownBlock };

function blockToMarkdown(
  block: MarkdownBlock,
  options: MarkdownOptions
): string {
  switch (block?._type) {
    case "richTextBlock":
      return richTextBlockToMarkdown(block, options);
    case "faqAccordion":
      return faqAccordionToMarkdown(block, options);
    default:
      return "";
  }
}

export function pageBuilderToMarkdown(
  blocks: MarkdownBlock[] | null | undefined,
  options: MarkdownOptions = {}
): string {
  if (!Array.isArray(blocks)) {
    return "";
  }

  return blocks
    .map((block) => blockToMarkdown(block, options))
    .filter((markdown) => markdown.trim())
    .join("\n\n");
}
