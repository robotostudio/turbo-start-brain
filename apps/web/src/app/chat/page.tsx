import type { Metadata } from "next";

import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Ask the docs assistant questions and get answers grounded in this knowledge base.",
  robots: { index: false },
};

export default function ChatPage() {
  return (
    // 3.5rem offsets the sticky h-14 site header so the transcript gets a
    // fixed height for the message scroller to fill.
    <main className="mx-auto grid h-[calc(100dvh-3.5rem)] w-full max-w-3xl min-h-0 px-5 sm:px-8">
      <ChatPanel />
    </main>
  );
}
