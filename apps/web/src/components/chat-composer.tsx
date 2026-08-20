"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { Spinner } from "@workspace/ui/components/spinner";
import type { ChatStatus } from "ai";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef } from "react";

// Keyed remount per state so the icon crossfades in via @starting-style; a
// light blur masks the swap between the two shapes.
function ComposerIcon({ status }: Readonly<{ status: ChatStatus }>) {
  let key = "send";
  let icon = <ArrowUpIcon />;
  if (status === "submitted") {
    key = "wait";
    icon = <Spinner />;
  } else if (status === "streaming") {
    key = "stop";
    icon = <SquareIcon className="size-3.5" />;
  }
  return (
    <span
      className="grid place-items-center transition-[opacity,filter] duration-200 ease-out starting:opacity-0 starting:blur-[2px]"
      key={key}
    >
      {icon}
    </span>
  );
}

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
      <InputGroup className="bg-background">
        <InputGroupTextarea
          aria-label="Ask the docs assistant"
          ref={textareaRef}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
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
        <InputGroupAddon align="inline-end">
          {/* One button whose icon crossfades between states (keyed remount +
              @starting-style) instead of two hard-swapped buttons; a light
              blur masks the swap and scale-on-press confirms the tap. */}
          <InputGroupButton
            aria-label={isBusy ? "Stop generating" : "Send message"}
            className="size-10 sm:size-8 transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-[0.94]"
            disabled={!isBusy && !canSend}
            onClick={isBusy ? onStop : undefined}
            size="icon-sm"
            type={isBusy ? "button" : "submit"}
            variant={isBusy ? "outline" : "default"}
          >
            <ComposerIcon status={status} />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
