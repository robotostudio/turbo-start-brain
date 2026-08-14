import { TableOfContent } from "@/components/elements/table-of-content";
import type { SanityRichTextProps } from "@/types";

export function DocsToc({
  body,
  title,
}: Readonly<{ body?: SanityRichTextProps; title?: string | null }>) {
  return (
    <div className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto xl:block">
      <TableOfContent
        className="bg-transparent p-0 [&>aside]:gap-6 [&>aside]:p-0 [&_a]:text-sm [&_ul]:gap-0.5"
        maxDepth={3}
        richText={body}
        shareTitle={title ?? undefined}
      />
    </div>
  );
}
