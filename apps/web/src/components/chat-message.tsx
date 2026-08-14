"use client";

import type { UIMessage } from "ai";
import { MessageResponse } from "@workspace/ui/components/ai-response";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import { Message, MessageContent } from "@workspace/ui/components/message";

// Streamdown security hardening: only same-origin (relative) links and images
// may render — the assistant is instructed to cite docs pages by slug.
// (Streamdown 2.x replaced v1's allowedLinkPrefixes/allowedImagePrefixes with
// a react-markdown-style urlTransform; returning null drops the URL.)
function sameOriginUrlTransform(url: string): string | null {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  if (url.startsWith("#")) {
    return url;
  }
  return null;
}

export function ChatMessage({
  message,
  isAnimating,
}: Readonly<{
  message: UIMessage;
  isAnimating: boolean;
}>) {
  const isUser = message.role === "user";

  return (
    <Message align={isUser ? "end" : "start"}>
      <MessageContent>
        {message.parts.map((part, index) => {
          if (part.type !== "text") {
            return null;
          }
          const key = `${message.id}-${index}`;
          if (isUser) {
            return (
              <Bubble align="end" key={key} variant="default">
                <BubbleContent>{part.text}</BubbleContent>
              </Bubble>
            );
          }
          return (
            <Bubble key={key} variant="ghost">
              <BubbleContent>
                <MessageResponse
                  isAnimating={isAnimating}
                  urlTransform={sameOriginUrlTransform}
                >
                  {part.text}
                </MessageResponse>
              </BubbleContent>
            </Bubble>
          );
        })}
      </MessageContent>
    </Message>
  );
}
