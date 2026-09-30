import { TocClerk } from "@/components/elements/toc-clerk";
import { hasTocHeadings } from "@/lib/toc";
import type { SanityRichTextProps } from "@/types";

export const TOC_MAX_DEPTH = 3;

export function DocsToc({ body }: Readonly<{ body?: SanityRichTextProps }>) {
  if (!hasTocHeadings(body, TOC_MAX_DEPTH)) {
    return null;
  }
  return (
    <div
      className="sticky top-10 hidden max-h-[calc(100dvh-5rem)] w-56 max-w-full overflow-y-auto xl:block 3xl:col-start-3"
      data-slot="docs-toc"
    >
      <TocClerk maxDepth={TOC_MAX_DEPTH} richText={body} />
    </div>
  );
}
