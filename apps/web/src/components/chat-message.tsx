"use client";

import { Renderer, useJsonRenderMessage } from "@json-render/react";
import type { UIMessage } from "ai";
import { MessageResponse } from "@workspace/ui/components/ai-response";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import { Message, MessageContent } from "@workspace/ui/components/message";

import { registry } from "@/lib/ai/registry";

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
  // Splits the message into conversational prose and the streamed json-render
  // spec (doc cards). Memoized; recomputes as streaming parts are appended.
  const { text, spec, hasSpec } = useJsonRenderMessage(message.parts);
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="default">
            <BubbleContent>{text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message align="start">
      <MessageContent>
        <Bubble variant="ghost">
          <BubbleContent>
            {text ? (
              <MessageResponse
                isAnimating={isAnimating}
                urlTransform={sameOriginUrlTransform}
              >
                {text}
              </MessageResponse>
            ) : null}
            {hasSpec && spec ? (
              <Renderer registry={registry} spec={spec} />
            ) : null}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
