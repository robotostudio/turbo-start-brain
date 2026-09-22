import type { Metadata, Viewport } from "next";

import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Ask the docs assistant questions and get answers grounded in this knowledge base.",
  robots: { index: false },
};

export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export default function ChatPage() {
  return (
    // 3.5rem offsets the sticky h-14 site header so the transcript gets a
    // fixed height for the message scroller to fill.
    <main className="grid h-[calc(100dvh-3.5rem)] w-full min-h-0 overflow-clip">
      <ChatPanel />
    </main>
  );
}
