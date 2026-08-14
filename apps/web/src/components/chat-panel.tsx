"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller";
import { Spinner } from "@workspace/ui/components/spinner";
import { useState } from "react";

import { ChatComposer } from "@/components/chat-composer";
import { ChatMessage } from "@/components/chat-message";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error } = useChat({
    // Stable id: useChat otherwise generates a random one at render time,
    // which Cache Components rejects during prerender.
    id: "docs-chat",
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const lastMessage = messages.at(-1);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) {
      return;
    }
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
      <MessageScrollerProvider
        autoScroll
        defaultScrollPosition="last-anchor"
        scrollPreviousItemPeek={64}
      >
        <MessageScroller>
          <MessageScrollerViewport>
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
              {status === "submitted" ? (
                <MessageScrollerItem messageId="pending">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0">
                    <Spinner />
                    Searching the docs…
                  </div>
                </MessageScrollerItem>
              ) : null}
              {status === "error" ? (
                <MessageScrollerItem messageId="error">
                  <p
                    className="text-destructive text-sm transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0"
                    role="alert"
                  >
                    {error?.message ??
                      "Something went wrong. Please try again."}
                  </p>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      <div className="pb-4">
        <ChatComposer
          input={input}
          onInputChange={setInput}
          onStop={() => {
            stop();
          }}
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
