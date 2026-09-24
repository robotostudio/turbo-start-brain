import { TocClerk } from "@/components/elements/toc-clerk";
import { hasTocHeadings } from "@/lib/toc";
import type { SanityRichTextProps } from "@/types";

export const TOC_MAX_DEPTH = 3;

/** The TOC column. Rendered on every page — empty when there are no headings —
 * so the content column never shifts between pages. */
export function DocsToc({ body }: Readonly<{ body?: SanityRichTextProps }>) {
  return (
    <div className="sticky top-10 hidden max-h-[calc(100dvh-5rem)] w-56 max-w-full overflow-y-auto xl:block 3xl:col-start-3">
      {hasTocHeadings(body, TOC_MAX_DEPTH) ? (
        <TocClerk maxDepth={TOC_MAX_DEPTH} richText={body} />
      ) : null}
    </div>
  );
}
