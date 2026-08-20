"use client";

import { Logger } from "@workspace/logger";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useTransition } from "react";

import { disableDraftMode } from "@/app/actions";

const logger = new Logger("PreviewBar");

// Trapezoid tab hanging off the top line: flat along the top edge, both sides
// sloping inwards so it reads as a notch dropping out of the line rather than
// a floating pill. The horizontal padding below is what gives the slopes room.
const TAB_CLIP =
  "polygon(0 0, 100% 0, calc(100% - 0.875rem) 100%, 0.875rem 100%)";

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
      className="pointer-events-none fixed inset-x-0 top-0 z-50 grid justify-items-center"
      role="status"
    >
      <div className="h-0.5 w-full bg-accent-green" />
      <div
        className="pointer-events-auto grid grid-flow-col items-center gap-3 bg-accent-green py-1 pr-6 pl-7 font-medium text-[0.6875rem] text-accent-green-foreground uppercase leading-4 tracking-[0.08em]"
        style={{ clipPath: TAB_CLIP }}
      >
        <span>Preview mode</span>
        {pending ? (
          <span className="opacity-60">Exiting…</span>
        ) : (
          <button
            aria-label="Exit preview mode"
            className="-mr-1.5 grid size-5 place-items-center rounded-full text-accent-green-foreground transition-[background-color,transform] duration-150 hover:bg-accent-green-foreground/12 focus-visible:outline-2 focus-visible:outline-accent-green-foreground focus-visible:outline-offset-1 active:scale-90 active:bg-accent-green-foreground/20"
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
    </div>
  );
};
