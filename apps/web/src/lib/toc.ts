import type { SanityRichTextProps } from "@/types";

const HEADING_LEVELS: Record<string, number> = {
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

const DEFAULT_MAX_DEPTH = 6;

function headingLevel(block: unknown): number | null {
  if (typeof block !== "object" || block === null) {
    return null;
  }
  const candidate = block as Record<string, unknown>;
  if (candidate._type !== "block" || typeof candidate.style !== "string") {
    return null;
  }
  return HEADING_LEVELS[candidate.style] ?? null;
}

function hasText(block: unknown): boolean {
  const children = (block as { children?: unknown }).children;
  if (!Array.isArray(children)) {
    return false;
  }
  return children.some(
    (child) =>
      typeof child === "object" &&
      child !== null &&
      (child as { _type?: unknown })._type === "span" &&
      typeof (child as { text?: unknown }).text === "string" &&
      (child as { text: string }).text.trim().length > 0
  );
}

/**
 * Server-side mirror of the client TOC's "is there anything to show" test
 * (see `useTableOfContentState` in components/elements/table-of-content.tsx).
 * Lets the doc route drop the 14rem TOC gutter before it renders, so a
 * heading-less page centres instead of sitting left of the measure.
 */
export function hasTocHeadings(
  richText?: SanityRichTextProps,
  maxDepth: number = DEFAULT_MAX_DEPTH
): boolean {
  if (!Array.isArray(richText)) {
    return false;
  }
  return richText.some((block) => {
    const level = headingLevel(block);
    return level !== null && level <= maxDepth && hasText(block);
  });
}
