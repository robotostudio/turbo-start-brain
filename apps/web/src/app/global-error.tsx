"use client";

import "@workspace/ui/globals.css";

import { Logger } from "@workspace/logger";
import { useEffect } from "react";

const logger = new Logger("GlobalError");

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    logger.error("Unhandled root layout error", error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-24">
          <div className="grid w-full max-w-2xl justify-items-center gap-8 text-center">
            <div className="inline-flex items-center gap-2.5 border border-border px-3 py-1.5 font-light font-mono text-foreground text-small uppercase tracking-[0.28px]">
              <span className="size-2 shrink-0 bg-accent-green" />
              <span>Error</span>
            </div>

            <h1 className="font-normal text-[clamp(6rem,26vw,15rem)] text-foreground leading-[0.8] tracking-tighter">
              {"500"}
            </h1>

            <h2 className="max-w-2xl text-balance font-normal text-h2 text-foreground sm:text-h1">
              The site failed to load.
            </h2>

            {error.digest ? (
              <p className="font-light font-mono text-muted-foreground text-small uppercase tracking-[0.28px]">
                Reference {error.digest}
              </p>
            ) : null}

            <button
              className="h-11 border border-border px-4 font-mono sm:h-9 font-normal text-foreground text-small uppercase tracking-wide transition-colors hover:bg-secondary"
              onClick={reset}
              type="button"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
