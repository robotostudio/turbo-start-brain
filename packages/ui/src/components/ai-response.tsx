"use client";

import { code } from "@streamdown/code";
import { cn } from "@workspace/tailwind-config/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

// Vendored from AI SDK Elements' `message` registry item — only the
// MessageResponse wrapper, with plugins trimmed to what this repo installs.
// Source: https://elements.ai-sdk.dev/api/registry/message.json

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { code };

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        // No `size-full` (upstream default): height:100% inside an auto-height
        // overflow-hidden Bubble pins the bubble to a stale height and clips
        // any sibling rendered after the prose (e.g. doc cards).
        "w-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating
);

MessageResponse.displayName = "MessageResponse";
