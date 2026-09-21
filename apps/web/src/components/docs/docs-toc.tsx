import { TocClerk } from "@/components/elements/toc-clerk";
import type { SanityRichTextProps } from "@/types";

export function DocsToc({
  body,
}: Readonly<{ body?: SanityRichTextProps; title?: string | null }>) {
  return (
    <div className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] w-56 max-w-full overflow-y-auto xl:block 3xl:col-start-3">
      <TocClerk maxDepth={3} richText={body} />
    </div>
  );
}
