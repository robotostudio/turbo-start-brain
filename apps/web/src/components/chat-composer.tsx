"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import type { ChatStatus } from "ai";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef } from "react";

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  status,
}: Readonly<{
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
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
      <InputGroup className="rounded-[26px] border-border/60 bg-muted shadow-sm dark:bg-muted">
        <InputGroupTextarea
          aria-label="Ask the docs assistant"
          className="max-h-40 min-h-0 py-3 pl-5 text-base md:text-[15px]"
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
          placeholder="Ask a question about the docs…"
          rows={1}
          value={input}
        />
        <InputGroupAddon
          align="inline-end"
          className="mr-0! self-end pr-1.5 pb-1.5"
        >
          <InputGroupButton
            aria-label={isBusy ? "Stop generating" : "Send message"}
            className="size-10 rounded-full transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-[0.94] disabled:opacity-40 sm:size-9"
            disabled={!isBusy && !canSend}
            onClick={isBusy ? onStop : undefined}
            size="icon-sm"
            type={isBusy ? "button" : "submit"}
            variant="default"
          >
            <span
              className="grid place-items-center transition-[opacity,filter] duration-200 ease-out starting:opacity-0 starting:blur-[2px]"
              key={isBusy ? "stop" : "send"}
            >
              {isBusy ? <SquareIcon className="size-3.5" /> : <ArrowUpIcon />}
            </span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
