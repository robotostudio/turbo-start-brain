import type { ChatStatus, UIMessage } from "ai";

/**
 * A coarse view of what the assistant is doing right now, derived entirely
 * client-side from the last assistant message's streamed parts. Drives the
 * thinking-orb indicator: each phase maps to an orb state + label.
 *
 * The route reads a Sanity Knowledge Base over MCP before it answers, so the
 * observable states are "the model hasn't emitted prose yet", "it is reading
 * the Knowledge Base" and "it is emitting the doc-card spec".
 */
export type ChatPhase = {
  /** Stable key — used to key label crossfades and pick the orb state. */
  key: "thinking" | "reading" | "cards";
  label: string;
};

const THINKING: ChatPhase = { key: "thinking", label: "Thinking" };
const READING: ChatPhase = { key: "reading", label: "Reading the docs" };
const CARDS: ChatPhase = { key: "cards", label: "Preparing doc cards" };

type Part = UIMessage["parts"][number];

/**
 * Maps one streamed part to a phase, or `null` for parts that carry no
 * progress signal (`step-start`, sources, …). Visible `text` returns
 * `undefined` — a sentinel meaning "the answer is rendering, hide the
 * indicator".
 */
function phaseForPart(part: Part): ChatPhase | null | undefined {
  switch (part.type) {
    case "reasoning":
      return THINKING;
    case "text":
      return part.text.trim().length > 0 ? undefined : null;
    default:
      // json-render streams the doc-card spec as data parts after the prose.
      if (part.type.startsWith("data-")) {
        return CARDS;
      }
      // Runtime-discovered MCP tools stream as `dynamic-tool`, not
      // `tool-<name>` — matching only the latter would never fire.
      return part.type === "dynamic-tool" || part.type.startsWith("tool-")
        ? READING
        : null;
  }
}

/**
 * Derives the current phase from chat status + the last message. Returns
 * `null` when no indicator should show (idle, aborted, errored, or the answer
 * text is already streaming in).
 */
export function deriveChatPhase(
  status: ChatStatus,
  lastMessage: UIMessage | undefined
): ChatPhase | null {
  if (status === "submitted") {
    return THINKING;
  }
  if (status !== "streaming") {
    return null;
  }
  // A user message as the tail means the assistant reply hasn't opened yet.
  if (!lastMessage || lastMessage.role !== "assistant") {
    return THINKING;
  }
  // The most recent signal wins: scan parts from the end.
  for (let i = lastMessage.parts.length - 1; i >= 0; i--) {
    const part = lastMessage.parts[i];
    if (!part) {
      continue;
    }
    const phase = phaseForPart(part);
    if (phase === undefined) {
      return null;
    }
    if (phase) {
      return phase;
    }
  }
  return THINKING;
}
