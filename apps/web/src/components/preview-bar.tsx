"use client";

import { Logger } from "@workspace/logger";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useTransition } from "react";

import { disableDraftMode } from "@/app/actions";

const logger = new Logger("PreviewBar");

const TAB_CLIP =
  "polygon(0.875rem 0, calc(100% - 0.875rem) 0, 100% 100%, 0 100%)";

export const PreviewBar: FC = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const disable = () => {
    logger.info("Disabling draft mode");
    startTransition(async () => {
      await disableDraftMode();
      router.refresh();
    });
  };

  return (
    <div
      aria-label="Preview mode"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 grid justify-items-center"
      role="status"
    >
      <div
        className="pointer-events-auto grid grid-flow-col items-center gap-3 bg-accent-green py-1 pr-6 pl-7 font-medium text-micro text-accent-green-foreground uppercase leading-4 tracking-[0.08em]"
        style={{ clipPath: TAB_CLIP }}
      >
        <span>Preview mode</span>
        {pending ? (
          <span className="opacity-60">Exiting…</span>
        ) : (
          <button
            aria-label="Exit preview mode"
            className="relative -mr-1.5 grid size-5 place-items-center after:absolute after:-inset-2.5 after:content-[''] text-accent-green-foreground transition-[background-color,transform] duration-150 hover:bg-accent-green-foreground/12 focus-visible:outline-2 focus-visible:outline-accent-green-foreground focus-visible:outline-offset-1 active:scale-[0.96] active:bg-accent-green-foreground/20"
            onClick={disable}
            title="Exit preview mode"
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              focusable="false"
              height="10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.75"
              viewBox="0 0 10 10"
              width="10"
            >
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
            </svg>
          </button>
        )}
      </div>
      <div className="h-0.5 w-full bg-accent-green" />
    </div>
  );
};
