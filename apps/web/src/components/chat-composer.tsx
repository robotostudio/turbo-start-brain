"use client";

import type { ChatStatus } from "ai";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { Spinner } from "@workspace/ui/components/spinner";
import { ArrowUpIcon, SquareIcon } from "lucide-react";

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
          autoFocus
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
          {isBusy ? (
            <InputGroupButton
              aria-label="Stop generating"
              onClick={onStop}
              size="icon-sm"
              type="button"
            >
              {status === "submitted" ? (
                <Spinner />
              ) : (
                <SquareIcon className="size-3.5" />
              )}
            </InputGroupButton>
          ) : (
            <InputGroupButton
              aria-label="Send message"
              disabled={!canSend}
              size="icon-sm"
              type="submit"
              variant="default"
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
