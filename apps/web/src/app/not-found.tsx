import { Button } from "@workspace/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";

import { SearchDocsButton } from "@/components/docs/search-docs-button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist.",
  robots: "noindex, nofollow",
  alternates: {},
};

const actionClassName =
  "h-9 px-4 font-mono font-normal text-small uppercase tracking-wide";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-6 py-24">
      <div className="grid w-full max-w-2xl justify-items-center gap-8 text-center">
        <div className="inline-flex items-center gap-2.5 border border-border px-3 py-1.5 font-light font-mono text-foreground text-small uppercase tracking-[0.28px]">
          <span className="size-2 shrink-0 bg-accent-green" />
          <span>Not found</span>
        </div>

        <h1 className="font-normal text-[clamp(6rem,26vw,15rem)] text-foreground leading-[0.8] tracking-tighter">
          {"4"} {"0"}
          {"4"}
        </h1>

        <h2 className="max-w-2xl text-balance font-normal text-h2 sm:text-h1">
          The page you are looking for does not exist.
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            className={actionClassName}
            size="sm"
            variant="secondary"
          >
            <Link href="/">Return home</Link>
          </Button>
          <SearchDocsButton className={actionClassName} />
        </div>
      </div>
    </main>
  );
}
