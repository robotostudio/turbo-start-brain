"use client";

import { ThinkingOrb, type OrbState } from "thinking-orbs";

import type { ChatPhase } from "@/lib/ai/chat-phase";

/**
 * Each chat phase gets its own hand-tuned orb animation:
 * - thinking → particles on tilted orbits
 * - cards    → a dotted outline morphs circle → triangle → square
 */
const ORB_STATE: Record<ChatPhase["key"], OrbState> = {
  thinking: "working",
  cards: "shaping",
};

export function ChatPhaseIndicator({ phase }: Readonly<{ phase: ChatPhase }>) {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2.5 text-muted-foreground text-sm transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-2 starting:opacity-0 motion-reduce:starting:translate-y-0"
    >
      <ThinkingOrb aria-hidden size={20} state={ORB_STATE[phase.key]} />
      {/* Keyed remount so label changes crossfade in via @starting-style; a
          light blur masks the swap (same recipe as the composer icon). */}
      <span
        className="transition-[opacity,filter] duration-200 ease-out starting:opacity-0 starting:blur-[2px]"
        key={phase.key}
      >
        {phase.label}…
      </span>
    </div>
  );
}
