"use client";

import { Logger } from "@workspace/logger";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { useEffect } from "react";

const logger = new Logger("AppError");

export default function RouteError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    logger.error("Unhandled route error", error);
  }, [error]);

  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-6 py-24">
      <div className="grid w-full max-w-2xl justify-items-center gap-8 text-center">
        <div className="inline-flex items-center gap-2.5 border border-border px-3 py-1.5 font-light font-mono text-foreground text-small uppercase tracking-[0.28px]">
          <span className="size-2 shrink-0 rounded-[1px] bg-accent-green" />
          <span>Error</span>
        </div>

        <h1 className="font-normal text-[clamp(6rem,26vw,15rem)] text-foreground leading-[0.8] tracking-tighter">
          {"5"}
          <span className="bg-grid-dots bg-clip-text text-foreground [-webkit-text-fill-color:transparent]">
            {"0"}
          </span>
          {"0"}
        </h1>

        <h2 className="max-w-2xl text-balance font-normal text-h2 sm:text-h1">
          Something went wrong on our side.
        </h2>

        {error.digest ? (
          <p className="font-light font-mono text-muted-foreground text-small uppercase tracking-[0.28px]">
            Reference {error.digest}
          </p>
        ) : null}

        <div className="grid grid-flow-col gap-3">
          <Button
            className="h-9 rounded-full px-4 font-mono font-normal text-small uppercase tracking-wide"
            onClick={reset}
            size="sm"
            variant="secondary"
          >
            Try again
          </Button>
          <Button
            asChild
            className="h-9 rounded-full px-4 font-mono font-normal text-small uppercase tracking-wide"
            size="sm"
            variant="ghost"
          >
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
