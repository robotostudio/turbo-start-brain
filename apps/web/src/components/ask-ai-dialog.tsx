"use client";

import { cn } from "@workspace/tailwind-config/utils";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatPanel } from "@/components/chat-panel";
import {
  ASK_AI_CLOSE_EVENT,
  ASK_AI_OPEN_EVENT,
  openAskAi,
} from "@/lib/ai/ask-ai-events";
import type { getChatSettings } from "@/lib/ai/chat-settings";

type ChatSettings = NonNullable<
  Awaited<ReturnType<typeof getChatSettings>>
>["chat"];

// Shown until an editor fills in the Chat document in Studio; the heading and
// intro match the schema's initial values.
const FALLBACK = {
  heading: "Ask the docs",
  intro:
    "Answers come straight from this knowledge base, with links to the pages they were found on.",
  suggestedQuestions: [
    "What is this knowledge base for?",
    "Where should I start?",
    "How is the documentation organised?",
  ],
};

const ASK_AI_TRIGGER_CLASS =
  "focus-ring inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap border border-border/60 bg-muted px-5 font-medium text-base text-foreground transition-[background-color,border-color,scale] hover:border-border hover:bg-muted/70 active:scale-[0.96] max-sm:h-11 sm:text-sm";

export function AskAiDialog({
  label,
  chat,
}: Readonly<{ label: string; chat: ChatSettings }>) {
  const [open, setOpen] = useState(false);
  // Bumping the key remounts the panel: a fresh useChat, so no messages,
  // input or in-flight state carries over.
  const [session, setSession] = useState(0);
  const [started, setStarted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpenRequest = () => setOpen(true);
    const onCloseRequest = () => setOpen(false);
    window.addEventListener(ASK_AI_OPEN_EVENT, onOpenRequest);
    window.addEventListener(ASK_AI_CLOSE_EVENT, onCloseRequest);
    return () => {
      window.removeEventListener(ASK_AI_OPEN_EVENT, onOpenRequest);
      window.removeEventListener(ASK_AI_CLOSE_EVENT, onCloseRequest);
    };
  }, []);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger className={ASK_AI_TRIGGER_CLASS}>{label}</DialogTrigger>
      {/* Kept mounted so the conversation survives closing the dialog. */}
      <DialogPortal keepMounted>
        <DialogBackdrop />
        <DialogPopup
          className="sm:top-[8dvh] sm:h-[min(44rem,84dvh)] sm:max-w-2xl"
          initialFocus={() => popupRef.current?.querySelector("textarea")}
          ref={popupRef}
        >
          <div className="flex h-14 shrink-0 items-center border-b ps-4 pe-1 sm:h-12">
            <DialogTitle className="me-auto text-base sm:text-sm">
              {label}
            </DialogTitle>
            {started ? (
              <button
                className="focus-ring inline-flex h-11 items-center gap-1.5 px-3 text-base text-muted-foreground transition-colors sm:h-10 sm:text-sm hover:text-foreground"
                onClick={() => {
                  setSession((current) => current + 1);
                  setStarted(false);
                  requestAnimationFrame(() =>
                    popupRef.current?.querySelector("textarea")?.focus()
                  );
                }}
                type="button"
              >
                <SquarePen aria-hidden="true" className="size-4" />
                New chat
              </button>
            ) : null}
            <DialogClose
              aria-label="Close"
              className="focus-ring grid size-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogClose>
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel
              fitViewport={false}
              key={session}
              onStartedChange={setStarted}
              heading={chat?.heading || FALLBACK.heading}
              intro={chat?.intro || FALLBACK.intro}
              placeholder={chat?.placeholder}
              suggestedQuestions={
                chat?.suggestedQuestions?.length
                  ? chat.suggestedQuestions
                  : FALLBACK.suggestedQuestions
              }
            />
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

/** Another place to open the one dialog `AskAiDialog` owns. */
export function AskAiButton({
  label,
  className,
}: Readonly<{ label: string; className?: string }>) {
  return (
    <button
      className={cn(ASK_AI_TRIGGER_CLASS, className)}
      onClick={openAskAi}
      type="button"
    >
      {label}
    </button>
  );
}
