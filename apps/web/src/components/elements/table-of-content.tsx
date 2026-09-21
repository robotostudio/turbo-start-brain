"use client";

import {
  headingChildrenToSlug,
  headingTextToSlug,
} from "@workspace/sanity-blocks/internal/heading-slug";
import {
  DISCLOSURE_ANIMATION_MS,
  useDisclosureAnimation,
} from "@workspace/sanity-blocks/internal/use-disclosure-animation";
import { cn } from "@workspace/tailwind-config/utils";
import { ChevronDown } from "lucide-react";
import { type FC, type MouseEvent, useEffect, useState } from "react";

import type { SanityRichTextBlock, SanityRichTextProps } from "@/types";

type TableOfContentProps = {
  richText?: SanityRichTextProps;
  className?: string;
  maxDepth?: number;
};

type ProcessedHeading = {
  readonly id: string;
  readonly text: string;
  readonly href: string;
  readonly level: number;
  readonly style: HeadingStyle;
  readonly children: ProcessedHeading[];
  readonly isChild: boolean;
  readonly _key?: string;
};

type AnchorProps = {
  readonly heading: ProcessedHeading;
  readonly activeSlug: string | null;
  readonly maxDepth?: number;
  readonly currentDepth?: number;
  // Namespaces the anchor's own DOM id so the desktop and mobile trees can both
  // render without producing duplicate ids.
  readonly idPrefix?: string;
  // Fires after a heading link activates, letting the mobile disclosure close.
  readonly onNavigate?: () => void;
};

type TableOfContentState = {
  readonly shouldShow: boolean;
  readonly headings: ProcessedHeading[];
  readonly error?: string;
};

type HeadingStyle = "h2" | "h3" | "h4" | "h5" | "h6";

type SanityTextChild = NonNullable<SanityRichTextBlock["children"]>[number];

type HeadingBlock = Extract<SanityRichTextBlock, { _type: "block" }> & {
  style: HeadingStyle;
  children: readonly SanityTextChild[];
};

const HEADING_STYLES: Record<HeadingStyle, string> = {
  h2: "pl-0",
  h3: "pl-4",
  h4: "pl-8",
  h5: "pl-12",
  h6: "pl-16",
} as const;

const HEADING_LEVELS: Record<HeadingStyle, number> = {
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
} as const;

// The y-offset a heading must pass to count as current. Matches the headings'
// own scroll-margin-top (`prose-headings:scroll-m-24`), so a heading reached by
// clicking the TOC is active the moment it lands rather than one item behind.
const READING_LINE = 96;
// `scrollIntoView` is sub-pixel while the scroll offset is rounded, so exact
// comparison misses by a fraction and credits the heading above.
const READING_LINE_SLACK = 2;

const DEFAULT_MAX_DEPTH = 6;
const MIN_HEADINGS_TO_SHOW = 1;
// Close animation duration plus a settle frame — scrolling waits this long.
const DISCLOSURE_CLOSE_MS = DISCLOSURE_ANIMATION_MS + 20;

function isValidHeadingStyle(style: unknown): style is HeadingStyle {
  return typeof style === "string" && style in HEADING_STYLES;
}

function isValidTextChild(child: unknown): child is SanityTextChild {
  return (
    typeof child === "object" &&
    child !== null &&
    "_type" in child &&
    child._type === "span" &&
    "text" in child &&
    typeof child.text === "string"
  );
}

function hasValidTextChildren(
  children: unknown
): children is readonly SanityTextChild[] {
  return (
    Array.isArray(children) &&
    children.length > 0 &&
    children.every(isValidTextChild)
  );
}

function isHeadingBlock(block: unknown): block is HeadingBlock {
  if (
    typeof block !== "object" ||
    block === null ||
    !("_type" in block) ||
    block._type !== "block"
  ) {
    return false;
  }

  const candidate = block as Record<string, unknown>;

  return (
    isValidHeadingStyle(candidate.style) &&
    hasValidTextChildren(candidate.children)
  );
}

function extractTextFromChildren(children: readonly SanityTextChild[]): string {
  try {
    return children
      .map((child) => child.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
      .trim();
  } catch (_error) {
    return "";
  }
}

function generateUniqueId(text: string, index: number, _key?: string): string {
  const baseId = _key || headingTextToSlug(text) || `heading-${index}`;
  return `toc-${baseId}`;
}

function extractHeadingBlocks(richText: SanityRichTextProps): HeadingBlock[] {
  if (!(richText && Array.isArray(richText))) {
    return [];
  }

  try {
    return richText.filter(isHeadingBlock);
  } catch (_error) {
    return [];
  }
}

function createProcessedHeading(
  block: HeadingBlock,
  index: number
): ProcessedHeading | null {
  try {
    const text = extractTextFromChildren(block.children);

    if (!text) {
      return null;
    }

    const level = HEADING_LEVELS[block.style];
    const href = `#${headingChildrenToSlug(block.children)}`;
    const id = generateUniqueId(text, index, block._key);

    return {
      id,
      text,
      href,
      level,
      style: block.style,
      children: [],
      isChild: false,
      _key: block._key,
    };
  } catch (_error) {
    return null;
  }
}

function buildHeadingHierarchy(
  flatHeadings: ProcessedHeading[],
  maxDepth: number = DEFAULT_MAX_DEPTH
): ProcessedHeading[] {
  if (flatHeadings.length === 0) {
    return [];
  }

  try {
    const result: ProcessedHeading[] = [];
    const processed = new Set<number>();

    flatHeadings.forEach((heading, index) => {
      if (processed.has(index) || heading.level > maxDepth) {
        return;
      }

      const children = collectChildHeadings(
        flatHeadings,
        index,
        processed,
        maxDepth
      );

      result.push({
        ...heading,
        children,
      });
    });

    return result;
  } catch (_error) {
    return flatHeadings.map((heading) => ({
      ...heading,
      children: [],
    }));
  }
}

function collectChildHeadings(
  headings: ProcessedHeading[],
  parentIndex: number,
  processed: Set<number>,
  maxDepth: number
): ProcessedHeading[] {
  const parentHeading = headings[parentIndex];

  if (!parentHeading || parentHeading.level >= maxDepth) {
    return [];
  }

  const children: ProcessedHeading[] = [];
  const parentLevel = parentHeading.level;

  for (let i = parentIndex + 1; i < headings.length; i++) {
    const currentHeading = headings[i];

    if (!currentHeading || currentHeading.level <= parentLevel) {
      break;
    }

    if (processed.has(i) || currentHeading.level > maxDepth) {
      continue;
    }

    processed.add(i);

    const nestedChildren = collectChildHeadings(
      headings,
      i,
      processed,
      maxDepth
    );

    children.push({
      ...currentHeading,
      children: nestedChildren,
      isChild: true,
    });
  }

  return children;
}

function processHeadingBlocks(
  headingBlocks: HeadingBlock[],
  maxDepth: number = DEFAULT_MAX_DEPTH
): ProcessedHeading[] {
  if (!Array.isArray(headingBlocks) || headingBlocks.length === 0) {
    return [];
  }

  try {
    const processedHeadings = headingBlocks
      .map(createProcessedHeading)
      .filter((heading): heading is ProcessedHeading => heading !== null);

    return buildHeadingHierarchy(processedHeadings, maxDepth);
  } catch (_error) {
    return [];
  }
}

export type FlatHeading = {
  readonly slug: string;
  readonly text: string;
  readonly level: number;
};

// Depth-first flattening for flat renderers (the clerk-style TOC) that draw
// their own depth rails instead of nesting lists.
export function flattenHeadings(headings: ProcessedHeading[]): FlatHeading[] {
  const result: FlatHeading[] = [];
  const walk = (items: ProcessedHeading[]) => {
    for (const item of items) {
      const slug = item.href.replace(/^#/, "");
      if (slug) {
        result.push({ slug, text: item.text, level: item.level });
      }
      if (item.children.length > 0) {
        walk(item.children);
      }
    }
  };
  walk(headings);
  return result;
}

function flattenSlugs(headings: ProcessedHeading[]): string[] {
  const result: string[] = [];
  const walk = (items: ProcessedHeading[]) => {
    for (const item of items) {
      result.push(item.href.replace(/^#/, ""));
      if (item.children.length > 0) {
        walk(item.children);
      }
    }
  };
  walk(headings);
  return result.filter(Boolean);
}

export function useTableOfContentState(
  richText?: SanityRichTextProps,
  maxDepth: number = DEFAULT_MAX_DEPTH
): TableOfContentState {
  try {
    if (!(richText && Array.isArray(richText)) || richText.length === 0) {
      return {
        shouldShow: false,
        headings: [],
      };
    }

    const headingBlocks = extractHeadingBlocks(richText);

    if (headingBlocks.length < MIN_HEADINGS_TO_SHOW) {
      return {
        shouldShow: false,
        headings: [],
      };
    }

    const processedHeadings = processHeadingBlocks(headingBlocks, maxDepth);

    return {
      shouldShow: processedHeadings.length >= MIN_HEADINGS_TO_SHOW,
      headings: processedHeadings,
    };
  } catch (error) {
    return {
      shouldShow: false,
      headings: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function useActiveHeading(slugKey: string): string | null {
  const { active } = useHeadingsInView(slugKey);
  return active === -1 ? null : (slugKey.split("|")[active] ?? null);
}

type HeadingsInView = {
  /** First heading whose section is on screen (-1 above the first heading). */
  readonly first: number;
  /** Last heading that has scrolled into the viewport. */
  readonly last: number;
  /** The single current heading: `first`, or the last one at page bottom. */
  readonly active: number;
};

const NONE_IN_VIEW: HeadingsInView = { first: -1, last: -1, active: -1 };

/** Index of the last heading whose top is at or above `y` (-1 if none). */
function lastIndexAtOrAbove(tops: readonly number[], y: number): number {
  return tops.findLastIndex((top) => top <= y);
}

function sameInView(a: HeadingsInView, b: HeadingsInView): boolean {
  return a.first === b.first && a.last === b.last && a.active === b.active;
}

export function useHeadingsInView(slugKey: string): HeadingsInView {
  const [inView, setInView] = useState<HeadingsInView>(NONE_IN_VIEW);

  useEffect(() => {
    const slugs = slugKey ? slugKey.split("|") : [];
    if (slugs.length === 0) {
      return;
    }
    // Headings missing from the DOM are skipped, but every index reported back
    // must still point into `slugs`, which the TOC renders in full.
    const found = slugs.flatMap((slug, index) => {
      const element = document.getElementById(slug);
      return element ? [{ element, index }] : [];
    });
    if (found.length === 0) {
      return;
    }
    const elements = found.map(({ element }) => element);
    const toSlugIndex = (i: number) =>
      i === -1 ? -1 : (found[i]?.index ?? -1);

    // Measured once and refreshed only when layout moves, so scrolling is pure
    // arithmetic over the cache and never forces a layout read.
    let tops: number[] = [];
    const measure = () => {
      tops = elements.map(
        (element) => element.getBoundingClientRect().top + window.scrollY
      );
    };

    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.scrollY + READING_LINE;
      const viewportBottom = window.scrollY + window.innerHeight;
      const first = lastIndexAtOrAbove(tops, line + READING_LINE_SLACK);
      const last = lastIndexAtOrAbove(tops, viewportBottom - 1);
      // The last heading can't always reach the line — there isn't necessarily
      // a viewport of content beneath it.
      const atBottom =
        viewportBottom >= document.documentElement.scrollHeight - 2;
      const next = {
        first: last === -1 ? -1 : toSlugIndex(Math.max(first, 0)),
        last: toSlugIndex(last),
        active: toSlugIndex(atBottom ? tops.length - 1 : first),
      };
      // Same values keep the same object, so scrolling within a section
      // doesn't re-render the TOC.
      setInView((current) => (sameInView(current, next) ? current : next));
    };
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };
    const remeasure = () => {
      measure();
      schedule();
    };

    measure();
    update();
    // Fonts finishing, images settling and the mobile disclosure opening all
    // move headings after mount; a stale cache would highlight the wrong item.
    const observer = new ResizeObserver(remeasure);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
    };
  }, [slugKey]);

  return inView;
}

const TableOfContentAnchor: FC<AnchorProps> = ({
  heading,
  activeSlug,
  maxDepth = DEFAULT_MAX_DEPTH,
  currentDepth = 1,
  idPrefix = "",
  onNavigate,
}) => {
  const { href, text, children, id } = heading;

  if (currentDepth > maxDepth) {
    return null;
  }

  if (!(text?.trim() && href?.trim())) {
    return null;
  }

  const slug = href.replace(/^#/, "");
  const isActive = activeSlug !== null && activeSlug === slug;
  const hasChildren =
    Array.isArray(children) && children.length > 0 && currentDepth < maxDepth;

  // In-page anchors are rendered as native <a>, not next/link, and rely on
  // native hash navigation plus the root's CSS scroll-behavior for smooth
  // scrolling. Next 16's patched history.pushState treats a JS hash update as
  // a navigation and resets the scroll position, cancelling any programmatic
  // scrollIntoView — the browser's own hash navigation is the only path the
  // router leaves alone.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !onNavigate
    ) {
      return;
    }
    // Mobile: collapse the disclosure first, then navigate once its close
    // animation has settled. Scrolling immediately overshoots — the TOC
    // above the target shrinks mid-scroll, pulling the heading up and past
    // the viewport top.
    event.preventDefault();
    onNavigate();
    window.setTimeout(() => {
      window.location.hash = slug;
    }, DISCLOSURE_CLOSE_MS);
  };

  return (
    <li className={cn(currentDepth > 1 && "ml-3")}>
      <a
        aria-current={isActive ? "location" : undefined}
        className={cn(
          "block rounded-none px-2 py-1.5 text-base leading-6 outline-none tracking-[0.01em] transition-colors focus-visible:[outline:2px_dotted_currentColor] focus-visible:[outline-offset:-3px]",
          isActive
            ? "bg-accent-green font-medium text-accent-green-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        href={href}
        id={`${idPrefix}${id}`}
        onClick={handleClick}
      >
        {text}
      </a>

      {hasChildren && (
        <ul className="mt-1 flex flex-col gap-1">
          {children.map((child, index) => (
            <TableOfContentAnchor
              activeSlug={activeSlug}
              currentDepth={currentDepth + 1}
              heading={child}
              idPrefix={idPrefix}
              key={child.id || `${child.text}-${index}-${currentDepth}`}
              maxDepth={maxDepth}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const MobileTableOfContent: FC<TableOfContentProps> = ({
  richText,
  className,
  maxDepth = DEFAULT_MAX_DEPTH,
}) => {
  const { shouldShow, headings, error } = useTableOfContentState(
    richText,
    maxDepth
  );

  const slugKey = flattenSlugs(headings).join("|");
  const activeSlug = useActiveHeading(slugKey);
  const [open, setOpen] = useState(true);
  const { detailsRef, contentRef } = useDisclosureAnimation(open);

  if (error || !shouldShow || headings.length === 0) {
    return null;
  }

  const handleSummaryClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setOpen((current) => !current);
  };

  return (
    <details
      className={cn(
        // No breakpoint here: the one caller decides where the rail takes
        // over, and a hardcoded `lg:hidden` would silently win over it.
        "overflow-hidden rounded-lg border text-zinc-800 dark:text-zinc-50",
        className
      )}
      open
      ref={detailsRef}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: summary is natively interactive */}
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-2 bg-background px-3 py-2.5 text-base text-foreground outline-none focus-visible:bg-accent [&::-webkit-details-marker]:hidden"
        onClick={handleSummaryClick}
      >
        On this page
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </summary>
      <div className="overflow-hidden" ref={contentRef}>
        <div className="flex flex-col gap-8 bg-background px-3 pb-3">
          <nav aria-label="On this page">
            <ul className="flex flex-col gap-2">
              {headings.map((heading, index) => (
                <TableOfContentAnchor
                  activeSlug={activeSlug}
                  currentDepth={1}
                  heading={heading}
                  idPrefix="mobile-"
                  key={heading.id || `${heading.text}-${index}`}
                  maxDepth={maxDepth}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </details>
  );
};
