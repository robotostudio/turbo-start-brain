"use client";

import { cn } from "@workspace/tailwind-config/utils";
import { Check } from "lucide-react";

import { CopyIcon } from "./icons";
import { COPY_STATUS_CLASS, useCopyToClipboard } from "./use-copy";

const SHOWN = "scale-100 opacity-100 blur-none";
const HIDDEN = "scale-[0.25] opacity-0 blur-[2px]";

export function CopyButton({
  code,
  className,
}: Readonly<{ code: string; className?: string }>) {
  const { status, copy } = useCopyToClipboard(() => code);
  const copied = status === "copied";

  return (
    // The name stays put and the outcome is announced separately: a name that
    // changes under a focused element is only sometimes re-read, and swapping
    // it mid-interaction also renames the control for voice input.
    <button
      aria-label="Copy code to clipboard"
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center p-1 text-muted-foreground transition-colors hover:text-foreground",
        COPY_STATUS_CLASS[status],
        className
      )}
      onClick={copy}
      type="button"
    >
      <span className="grid size-4 place-items-center *:col-start-1 *:row-start-1 *:transition-[opacity,scale,filter] *:duration-(--duration-fast) *:ease-in-out">
        <Check
          aria-hidden="true"
          className={cn("size-4", copied ? SHOWN : HIDDEN)}
        />
        <CopyIcon className={cn("size-4", copied ? HIDDEN : SHOWN)} />
      </span>
      <output className="sr-only">{copied ? "Copied to clipboard" : ""}</output>
    </button>
  );
}
