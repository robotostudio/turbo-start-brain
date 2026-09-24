import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import type { DocsTreeNode } from "@/lib/docs-tree";

export function DocsPager({
  previous,
  next,
}: Readonly<{
  previous?: DocsTreeNode;
  next?: DocsTreeNode;
}>) {
  if (!(previous || next)) {
    return null;
  }

  return (
    <nav
      aria-label="Documentation pagination"
      className="mt-16 grid gap-4 border-t pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <Link
          className="group border p-4 transition-colors hover:bg-muted"
          href={previous.slug}
        >
          <span className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            Previous
          </span>
          <span className="mt-2 block font-medium">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          className="group border p-4 text-right transition-colors hover:bg-muted"
          href={next.slug}
        >
          <span className="flex items-center justify-end gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            Next
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-2 block font-medium">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
