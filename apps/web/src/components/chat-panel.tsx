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
import { useState } from "react";

import { ChatComposer } from "@/components/chat-composer";
import { ChatPhaseIndicator } from "@/components/chat-phase-indicator";
import { parseChatErrorCode } from "@/lib/ai/chat-errors";
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

// Starting points for the empty state, one per top-level docs section, so a
// first-time visitor has something to click instead of a blank column.
const EXAMPLE_QUESTIONS = [
  "What should I do in my first week?",
  "How does a migration project get sequenced?",
  "Which tools do I need accounts for?",
  "How do we talk to clients?",
] as const;

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

export function ChatPanel() {
  const [input, setInput] = useState("");
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
  const errorMessage =
    errorCode || !error?.message
      ? "Something went wrong. Please try again."
      : error.message;

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

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
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
            <MessageScrollerContent className="py-6">
              {messages.length === 0 ? (
                <div className="grid flex-1 place-items-center">
                  <div className="max-w-md text-center transition-opacity duration-500 ease-out starting:opacity-0">
                    <h2 className="font-semibold text-foreground text-lg">
                      Ask the docs
                    </h2>
                    <p className="mt-2 text-muted-foreground text-sm">
                      Answers come straight from this knowledge base, with links
                      to the pages they were found on.
                    </p>
                    <ul className="mt-6 grid gap-2 text-left">
                      {EXAMPLE_QUESTIONS.map((question) => (
                        <li key={question}>
                          <button
                            className="w-full rounded-lg border bg-card px-3 py-2 text-left text-sm transition-[background-color,border-color,scale] duration-150 ease-out hover:border-foreground/20 hover:bg-accent active:scale-[0.98]"
                            onClick={() => sendMessage({ text: question })}
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
                    // Machine-readable code for whoever is debugging; the copy
                    // stays generic until the error-state ticket designs it.
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
      <div className="pb-4">
        <ChatComposer
          input={input}
          onInputChange={setInput}
          onStop={handleStop}
          onSubmit={handleSubmit}
          status={status}
        />
        <p className="mt-2 text-center text-muted-foreground text-xs">
          Answers are generated from the documentation and may be incomplete.
        </p>
      </div>
    </div>
  );
}
