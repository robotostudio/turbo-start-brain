"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import type { ChatStatus } from "ai";
import { ArrowUpIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { ThinkingOrb } from "thinking-orbs";

const SHOWN = "scale-100 opacity-100 blur-none";
const HIDDEN = "scale-[0.25] opacity-0 blur-[4px]";

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  placeholder,
  status,
}: Readonly<{
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  placeholder?: string | null;
  status: ChatStatus;
}>) {
  const isBusy = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && !isBusy;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // `autoFocus` is unreliable here: with streaming SSR + hydration React can
  // mount this textarea after the browser's autofocus window has closed, so
  // the page whose only job is typing a question opened with nothing focused
  // (audit: activeElement was BODY, 69 Tabs from the input). Focus once on
  // mount instead; `preventScroll` keeps a restored scroll position intact.
  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) {
          onSubmit();
        }
      }}
    >
      <InputGroup className="border-border/60 bg-muted shadow-sm dark:bg-muted">
        <InputGroupTextarea
          aria-label="Ask the docs assistant"
          className="max-h-40 min-h-0 py-3 pl-5 text-base"
          ref={textareaRef}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isBusy) {
              onStop();
            } else if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) {
                onSubmit();
              }
            }
          }}
          placeholder={placeholder || "Ask a question…"}
          rows={1}
          value={input}
        />
        <InputGroupAddon
          align="inline-end"
          className="mr-0! self-end pr-1.5 pb-1.5"
        >
          <InputGroupButton
            aria-label={isBusy ? "Stop generating" : "Send message"}
            className="size-11 transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-[0.96] disabled:opacity-40 sm:size-10"
            disabled={!isBusy && !canSend}
            onClick={isBusy ? onStop : undefined}
            size="icon-sm"
            type={isBusy ? "button" : "submit"}
            // Busy shows the orb on the bar itself, not on a white fill.
            variant={isBusy ? "ghost" : "default"}
          >
            <span className="grid place-items-center *:col-start-1 *:row-start-1 *:transition-[opacity,scale,filter] *:duration-200 *:ease-[cubic-bezier(0.2,0,0,1)]">
              <ThinkingOrb
                aria-hidden
                className={isBusy ? SHOWN : HIDDEN}
                size={20}
                state="searching"
              />
              <ArrowUpIcon
                aria-hidden="true"
                className={isBusy ? HIDDEN : SHOWN}
              />
            </span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
