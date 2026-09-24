"use client";

import { useChat } from "@ai-sdk/react";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller";
import { DefaultChatTransport, type UIMessage } from "ai";
import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ThinkingOrb } from "thinking-orbs";

import { ChatComposer } from "@/components/chat-composer";
import { ChatPhaseIndicator } from "@/components/chat-phase-indicator";
import { CHAT_ERROR, parseChatErrorCode } from "@/lib/ai/chat-errors";
import { finalizeAbortedMessages } from "@/lib/ai/chat-history";
import { deriveChatPhase } from "@/lib/ai/chat-phase";

// The message renderer drags in streamdown + shiki, json-render and the
// blossom carousel — ~260 KB gzip the audit measured loading before a single
// keystroke. There is nothing to render until the first message exists (the
// transcript starts empty and is never server-rendered), so defer the whole
// graph to that moment. `ssr: false` is deliberate: the loader must never run
// during prerender or the chunk lands back in the initial script set.
const ChatMessage = dynamic(
  () => import("@/components/chat-message").then((mod) => mod.ChatMessage),
  { ssr: false }
);

const QUESTION_PILL =
  "border bg-card px-4 py-2 text-sm transition-[background-color,border-color,scale] duration-150 ease-out hover:border-foreground/20 hover:bg-accent active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50";

// Speakable text of an assistant message for the screen-reader mirror below:
// fenced blocks (the doc-card spec is machine data) dropped, markdown links
// reduced to their label so brackets and slugs are not read aloud.
const FENCE = /```[\s\S]*?```/g;
const MARKDOWN_LINK = /\[([^\]]+)\]\([^)]*\)/g;
function speakableText(message: UIMessage | undefined) {
  if (!message || message.role !== "assistant") {
    return "";
  }
  return message.parts
    .filter(
      (part): part is Extract<typeof part, { type: "text" }> =>
        part.type === "text"
    )
    .map((part) => part.text)
    .join("\n")
    .replace(FENCE, "")
    .replace(MARKDOWN_LINK, "$1")
    .trim();
}

function ChatWelcome({
  heading,
  intro,
}: Readonly<{ heading?: string | null; intro?: string | null }>) {
  return (
    <>
      <ThinkingOrb
        aria-hidden
        className="mx-auto mb-5"
        size={64}
        state="working"
      />
      {heading ? (
        <h2 className="font-semibold text-foreground text-lg">{heading}</h2>
      ) : null}
      {intro ? (
        <p className="mt-2 text-balance text-muted-foreground text-sm">
          {intro}
        </p>
      ) : null}
    </>
  );
}

function subscribeToViewport(onChange: () => void) {
  const viewport = window.visualViewport;
  if (!viewport) {
    return () => {};
  }
  const onScroll = () => {
    if (viewport.scale <= 1 && viewport.offsetTop > 0) {
      window.scrollTo(0, 0);
    }
    onChange();
  };
  viewport.addEventListener("resize", onChange);
  viewport.addEventListener("scroll", onScroll);
  return () => {
    viewport.removeEventListener("resize", onChange);
    viewport.removeEventListener("scroll", onScroll);
  };
}
function getViewportHeight() {
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale > 1) {
    return 0;
  }
  return Math.round(viewport.height);
}

export function ChatPanel({
  fitViewport = true,
  heading,
  intro,
  onStartedChange,
  placeholder,
  suggestedQuestions,
}: Readonly<{
  /** Track the visual viewport (mobile keyboard) below the site header. Off
   * inside a dialog, which sizes itself. */
  fitViewport?: boolean;
  heading?: string | null;
  intro?: string | null;
  /** Fires when the conversation gains its first message (or is empty). */
  onStartedChange?: (started: boolean) => void;
  placeholder?: string | null;
  suggestedQuestions: readonly string[];
}>) {
  const viewportHeight = useSyncExternalStore(
    subscribeToViewport,
    getViewportHeight,
    () => 0
  );
  const [input, setInput] = useState("");
  const [clickedPills, setClickedPills] = useState<string[]>([]);
  const [hasTyped, setHasTyped] = useState(false);
  const { messages, sendMessage, setMessages, status, stop, error } = useChat({
    // Stable id: useChat otherwise generates a random one at render time,
    // which Cache Components rejects during prerender.
    id: "docs-chat",
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // The route reports failures as `{"code":"…"}` on both transports, which
  // `useChat` hands over as `error.message`. Keep that out of the UI copy — it
  // is a debugging signal, not a sentence.
  const errorCode = parseChatErrorCode(error?.message);
  let errorMessage = "Something went wrong. Please try again.";
  if (errorCode === CHAT_ERROR.budgetExhausted) {
    errorMessage =
      "The assistant has reached its usage limit. Please try again later.";
  } else if (!errorCode && error?.message) {
    errorMessage = error.message;
  }

  const started = messages.length > 0;
  useEffect(() => {
    onStartedChange?.(started);
  }, [onStartedChange, started]);

  const lastMessage = messages.at(-1);
  // What the assistant is doing right now (thinking / preparing doc cards),
  // derived from the streamed parts. Null once answer text is rendering — the
  // text itself is the progress signal then.
  const phase = deriveChatPhase(status, lastMessage);

  // `stop()` only aborts the fetch; the half-written assistant message stays in
  // state exactly as it was. Tidy it before the user can ask anything else, so
  // the next turn posts a coherent history (see finalizeAbortedMessages).
  //
  // Finalizing immediately after is safe not because `stop()` waits — it aborts
  // synchronously and returns — but because every write the SDK makes past that
  // point is gated on the same aborted signal (`runUpdateMessageJob` bails, and
  // its inner `write()` re-checks), so no stream chunk can land on top of this.
  const handleStop = () => {
    stop();
    setMessages(finalizeAbortedMessages);
  };

  const askQuestion = (question: string) => {
    setClickedPills((clicked) => [...clicked, question]);
    sendMessage({ text: question });
  };

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) {
      return;
    }
    setInput("");
    sendMessage({ text });
  };

  // Streamed answer text lands in the DOM silently — only the phase indicator
  // is a live region, so a screen reader hears "Thinking…" and then nothing.
  // Announcing per token would be unbearable; instead mirror the finished
  // answer once into a visually-hidden polite region when the stream settles.
  const announcedAnswer = status === "ready" ? speakableText(lastMessage) : "";

  const followUps =
    messages.length > 0 && !hasTyped
      ? suggestedQuestions.filter(
          (question) => !clickedPills.includes(question)
        )
      : [];
  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div
      className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] transition-[height] duration-200 ease-out motion-reduce:transition-none"
      style={{
        height:
          fitViewport && viewportHeight
            ? `calc(${viewportHeight}px - 3.5rem)`
            : undefined,
      }}
    >
      <MessageScrollerProvider
        autoScroll
        defaultScrollPosition="last-anchor"
        scrollPreviousItemPeek={64}
      >
        <MessageScroller>
          {/* Focusable so a keyboard-only reader can arrow/PageDown through a
              long answer that has no links to tab to. role="region" (not
              "log", whose implicit aria-live would narrate every token). */}
          <MessageScrollerViewport
            aria-label="Conversation"
            role="region"
            tabIndex={0}
          >
            <MessageScrollerContent className="mx-auto w-full max-w-[832px] px-5 py-6 sm:px-8">
              {messages.length === 0 ? (
                <div className="grid flex-1 place-items-center">
                  <div className="max-w-md text-center transition-opacity duration-500 ease-out starting:opacity-0">
                    <ChatWelcome heading={heading} intro={intro} />
                    <ul className="mx-auto mt-6 grid w-full max-w-sm gap-2">
                      {suggestedQuestions.map((question) => (
                        <li key={question}>
                          <button
                            className={`w-full text-center ${QUESTION_PILL}`}
                            onClick={() => askQuestion(question)}
                            type="button"
                          >
                            {question}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <ChatMessage
                      isAnimating={
                        status === "streaming" && message.id === lastMessage?.id
                      }
                      message={message}
                    />
                  </MessageScrollerItem>
                ))
              )}
              {phase ? (
                <MessageScrollerItem messageId="pending">
                  <ChatPhaseIndicator phase={phase} />
                </MessageScrollerItem>
              ) : null}
              {status === "error" ? (
                <MessageScrollerItem messageId="error">
                  <p
                    className="text-destructive text-sm transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0"
                    data-error-code={errorCode}
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      <output aria-live="polite" className="sr-only">
        {announcedAnswer}
      </output>
      <div className="mx-auto w-full max-w-[832px] px-5 pb-4 sm:px-8">
        {followUps.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-2">
            {followUps.map((question) => (
              <li className="min-w-0 max-w-full" key={question}>
                <button
                  className={`max-w-full truncate ${QUESTION_PILL}`}
                  disabled={isBusy}
                  onClick={() => askQuestion(question)}
                  type="button"
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <ChatComposer
          input={input}
          placeholder={placeholder}
          onInputChange={(value) => {
            setInput(value);
            if (value.trim()) {
              setHasTyped(true);
            }
          }}
          onStop={handleStop}
          onSubmit={handleSubmit}
          status={status}
        />
      </div>
    </div>
  );
}
