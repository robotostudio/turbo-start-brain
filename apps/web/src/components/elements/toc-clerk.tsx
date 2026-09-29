"use client";

import { cn } from "@workspace/tailwind-config/utils";
import { AlignLeft } from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type FlatHeading,
  flattenHeadings,
  useHeadingsInView,
  useTableOfContentState,
} from "@/components/elements/table-of-content";
import type { SanityRichTextProps } from "@/types";

type TocClerkProps = {
  richText?: SanityRichTextProps;
  className?: string;
  maxDepth?: number;
};

// Clerk-style rail geometry, ported from fumadocs
// (packages/base-ui/src/components/toc/clerk.tsx): every depth gets its own
// vertical line offset, items indent past their line, and depth changes are
// bridged with a short diagonal.
const RAIL_BASE = 8;

function getLineOffset(level: number): number {
  if (level <= 2) {
    return RAIL_BASE;
  }
  if (level === 3) {
    return RAIL_BASE + 12;
  }
  return RAIL_BASE + 24;
}

function getItemOffset(level: number): number {
  return getLineOffset(level) + 12;
}

// The heading-extraction hook builds fresh arrays every render; reuse the
// previous array while the slugs are unchanged so the measurement effect
// (and its ResizeObserver) doesn't re-run — and loop — on every render.
function useStableItems(items: FlatHeading[]): FlatHeading[] {
  const key = items.map((item) => item.slug).join("|");
  const ref = useRef({ key, items });
  if (ref.current.key !== key) {
    ref.current = { key, items };
  }
  return ref.current.items;
}

type MeasuredRail = {
  readonly width: number;
  readonly height: number;
  readonly path: string;
  // Per item: [top, bottom] of its segment along the rail.
  readonly positions: readonly [number, number][];
};

// Measures the rendered anchors and builds one SVG path tracing the whole
// rail. The primary-colored copy of that path is clipped to the span of
// headings in view; animating clip-path grows and shrinks the indicator.
function useMeasuredRail(items: FlatHeading[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState<MeasuredRail | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || container.clientHeight === 0 || items.length === 0) {
      setRail(null);
      return;
    }
    let width = 0;
    let height = 0;
    let path = "";
    const positions: [number, number][] = [];

    for (const [index, item] of items.entries()) {
      const element = container.querySelector<HTMLElement>(
        `a[data-toc-slug="${CSS.escape(item.slug)}"]`
      );
      if (!element) {
        // Keep positions index-aligned with items so the in-view range lookup
        // stays valid even if an anchor is missing.
        positions.push(positions.at(-1) ?? [0, 0]);
        continue;
      }
      const styles = getComputedStyle(element);
      const x = getLineOffset(item.level) + 0.5;
      const top = element.offsetTop + Number.parseFloat(styles.paddingTop);
      const bottom =
        element.offsetTop +
        element.clientHeight -
        Number.parseFloat(styles.paddingBottom);

      width = Math.max(width, x + 8);
      height = Math.max(height, bottom);

      if (path === "") {
        path += `M${x} ${top} L${x} ${bottom}`;
      } else {
        const previous = positions[index - 1];
        const previousX = getLineOffset(items[index - 1]?.level ?? 2) + 0.5;
        path += ` L ${previousX} ${previous?.[1] ?? top} ${x} ${top} L${x} ${bottom}`;
      }
      positions.push([top, bottom]);
    }

    const next: MeasuredRail = { width, height, path, positions };
    // Re-measures fire from ResizeObserver on every commit; only update state
    // when geometry actually changed, or the observer/effect loop never
    // settles.
    setRail((current) =>
      current && JSON.stringify(current) === JSON.stringify(next)
        ? current
        : next
    );
  }, [items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    return () => {
      observer.disconnect();
    };
  }, [measure]);

  return { containerRef, rail };
}

function ThumbTrack({
  rail,
  first,
  last,
}: Readonly<{ rail: MeasuredRail; first: number; last: number }>) {
  const top = first >= 0 ? rail.positions[first]?.[0] : undefined;
  const bottom = last >= 0 ? rail.positions[last]?.[1] : undefined;
  const style = {
    width: rail.width,
    height: rail.height,
    "--track-top": `${top ?? 0}px`,
    "--track-bottom": `${bottom ?? 0}px`,
  } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className="absolute start-0 top-0 transition-[clip-path] duration-200 ease-(--ease-smooth-out)"
      style={{
        ...style,
        clipPath:
          "polygon(0 var(--track-top), 100% var(--track-top), 100% var(--track-bottom), 0 var(--track-bottom))",
      }}
      viewBox={`0 0 ${rail.width} ${rail.height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="stroke-primary"
        d={rail.path}
        fill="none"
        strokeWidth="1"
      />
    </svg>
  );
}

function ItemRail({
  items,
  index,
}: Readonly<{ items: FlatHeading[]; index: number }>) {
  const item = items[index];
  if (!item) {
    return null;
  }
  const isFirst = index === 0;
  const line = getLineOffset(item.level);
  const lineAbove = isFirst
    ? line
    : getLineOffset(items[index - 1]?.level ?? item.level);
  const lineBelow =
    index === items.length - 1
      ? line
      : getLineOffset(items[index + 1]?.level ?? item.level);

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "-top-1.5 -z-[1] absolute start-0 bottom-0 h-[calc(100%+0.375rem)]",
        line !== lineBelow && "bottom-1.5 h-full"
      )}
      style={{ width: Math.max(lineAbove, line) + 9 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {lineAbove !== line && (
        <path
          className="stroke-foreground/10"
          d={`M ${lineAbove + 0.5} 0 L ${lineAbove + 0.5} 0 ${line + 0.5} 12`}
          fill="none"
          strokeWidth="1"
        />
      )}
      <line
        className="stroke-foreground/10"
        strokeWidth="1"
        x1={line + 0.5}
        x2={line + 0.5}
        y1={lineAbove === line ? 6 : 12}
        y2="100%"
      />
    </svg>
  );
}

export function TocClerk({ richText, className, maxDepth = 3 }: TocClerkProps) {
  const { shouldShow, headings, error } = useTableOfContentState(
    richText,
    maxDepth
  );
  const flat = useStableItems(flattenHeadings(headings));
  const slugKey = flat.map((item) => item.slug).join("|");
  const { first, last } = useHeadingsInView(slugKey);
  const { containerRef, rail } = useMeasuredRail(flat);

  if (error || !shouldShow || flat.length === 0) {
    return null;
  }

  return (
    <nav aria-labelledby="toc-heading" className={cn("text-sm", className)}>
      <p
        className="mb-3 flex items-center gap-2 font-medium text-foreground"
        id="toc-heading"
      >
        <AlignLeft aria-hidden="true" className="size-4" />
        On this page
      </p>
      <div className="relative flex flex-col" ref={containerRef}>
        {rail ? <ThumbTrack first={first} last={last} rail={rail} /> : null}
        {flat.map((item, index) => {
          const isActive = index >= first && index <= last;
          return (
            <a
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "relative wrap-anywhere py-1.5 transition-colors first-of-type:pt-0 last:pb-0",
                isActive
                  ? "font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-toc-slug={item.slug}
              href={`#${item.slug}`}
              key={item.slug}
              style={{ paddingInlineStart: getItemOffset(item.level) }}
            >
              <ItemRail index={index} items={flat} />
              {item.text}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
