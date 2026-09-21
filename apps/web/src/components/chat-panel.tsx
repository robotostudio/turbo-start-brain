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

// Starter questions, one per top-level docs section: the empty state's list,
// then the pill row above the composer until each one is clicked.
const EXAMPLE_QUESTIONS = [
  "What should I do in my first week?",
  "How does a migration project get sequenced?",
  "Which tools do I need accounts for?",
  "How do we talk to clients?",
] as const;

const QUESTION_PILL =
  "rounded-full border bg-card px-4 py-2 text-sm transition-[background-color,border-color,scale] duration-150 ease-out hover:border-foreground/20 hover:bg-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

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
  const [clickedPills, setClickedPills] = useState<string[]>([]);
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

  // A clicked starter question leaves the pill row for good; typed messages
  // never remove one.
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

  // Once the conversation starts, the starter questions not yet clicked show as
  // pills above the composer.
  const followUps =
    messages.length > 0
      ? EXAMPLE_QUESTIONS.filter((question) => !clickedPills.includes(question))
      : [];
  const isBusy = status === "submitted" || status === "streaming";

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
            <MessageScrollerContent className="mx-auto w-full max-w-[832px] px-5 py-6 sm:px-8">
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
                            className={`w-full text-left ${QUESTION_PILL}`}
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
                    // Machine-readable code for whoever is debugging; only the
                    // spent-budget case has its own copy so far.
                    data-error-code={errorCode}
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className="rounded-full" />
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
          onInputChange={setInput}
          onStop={handleStop}
          onSubmit={handleSubmit}
          status={status}
        />
      </div>
    </div>
  );
}
