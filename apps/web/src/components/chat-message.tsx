"use client";
import {
  JSONUIProvider,
  Renderer,
  useJsonRenderMessage,
} from "@json-render/react";
import { MessageResponse } from "@workspace/ui/components/ai-response";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import { Message, MessageContent } from "@workspace/ui/components/message";
import type { UIMessage } from "ai";
import Link from "next/link";
import type { ComponentProps } from "react";

import { closeAskAi } from "@/lib/ai/ask-ai-events";
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

function ChatLink({ href, children }: ComponentProps<"a">) {
  if (!href) {
    return <>{children}</>;
  }
  return (
    <Link
      className="font-medium underline decoration-from-font [text-underline-position:from-font]"
      href={href}
      onClick={closeAskAi}
      prefetch={false}
    >
      {children}
    </Link>
  );
}

const CHAT_COMPONENTS = { a: ChatLink };
const NO_LINK_SAFETY = { enabled: false };

// Entry animation: fade + rise via @starting-style (interruptible CSS
// transition, transform/opacity only). Motion is dropped under
// prefers-reduced-motion; the fade stays.
const MESSAGE_ENTER =
  "transition-[opacity,translate] duration-300 ease-(--ease-smooth-out) starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0";

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
      <Message align="end" className={MESSAGE_ENTER}>
        <MessageContent>
          <Bubble align="end" variant="default">
            <BubbleContent className="px-4">{text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message align="start" className={MESSAGE_ENTER}>
      <MessageContent>
        <Bubble variant="ghost">
          <BubbleContent>
            {text ? (
              <MessageResponse
                components={CHAT_COMPONENTS}
                isAnimating={isAnimating}
                linkSafety={NO_LINK_SAFETY}
                urlTransform={sameOriginUrlTransform}
              >
                {text}
              </MessageResponse>
            ) : null}
            {hasSpec && spec ? (
              <JSONUIProvider registry={registry}>
                {/* loading while streaming: the scroller patch arrives before
                    its card patches; suppresses missing-child warnings. */}
                <Renderer
                  loading={isAnimating}
                  registry={registry}
                  spec={spec}
                />
              </JSONUIProvider>
            ) : null}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
