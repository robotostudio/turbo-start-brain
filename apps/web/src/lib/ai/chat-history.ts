import type { UIMessage } from "ai";

/**
 * Stands in for an assistant turn the user stopped before any prose arrived.
 * It is real message content, not decoration: see below for why the turn has
 * to survive rather than be deleted.
 */
const STOPPED_NOTE = "Response stopped.";

function stoppedTextPart<T extends UIMessage>(): T["parts"][number] {
  return {
    type: "text",
    text: STOPPED_NOTE,
    state: "done",
  } as T["parts"][number];
}

/** A whole assistant turn that is nothing but the stopped note. */
function stoppedMessage<T extends UIMessage>(): T {
  return {
    // Distinct from any server-generated id, and one stop per millisecond is
    // the most a human hand can manage.
    id: `stopped-${Date.now()}`,
    role: "assistant",
    parts: [stoppedTextPart<T>()],
  } as unknown as T;
}

/**
 * Tidies the assistant message `stop()` leaves behind, so the transcript reads
 * straight and the *next* question is answered on its own.
 *
 * `useChat` keeps whatever streamed, and that tail is not always coherent:
 *
 * - Nothing is added to the message list until the first `text-start` chunk
 *   (`start-step` pushes a part but does not commit), so for the first second
 *   or two of a request — the most likely moment to hit stop — the list still
 *   ends with the *user* message and no assistant turn exists at all.
 * - `text-start` then commits a text part with `text: ""` and
 *   `state: "streaming"`, so stopping in the next window leaves an empty
 *   bubble in the list forever.
 * - Text parts stay marked `streaming` forever, which is a lie once the stream
 *   is gone.
 *
 * Leaving the tail as a user message — or deleting the empty assistant message
 * — is the obvious handling and it is wrong: the next `sendMessage` then
 * appends a second user message, `convertToModelMessages` emits two
 * consecutive user turns, and the model answers the cancelled question as well
 * as the new one. Verified against the live route. So every abort has to end
 * on an assistant turn carrying at least one non-empty text part: that is what
 * `STOPPED_NOTE` is for. It keeps the roles alternating and tells the model
 * that answer was cut short.
 *
 * So: trim the partial prose, mark it done, drop blank text parts, and fall
 * back to the stopped note when no prose survived. Doc-card data parts are
 * kept — every emitted patch is a complete JSONL line, and
 * `convertToModelMessages` drops data parts before the model ever sees them.
 */
export function finalizeAbortedMessages<T extends UIMessage>(
  messages: readonly T[]
): T[] {
  const last = messages.at(-1);
  if (!last) {
    return [];
  }
  if (last.role !== "assistant") {
    // Stopped before the first chunk landed: there is no assistant message to
    // repair, only a user turn that will never be answered.
    return [...messages, stoppedMessage<T>()];
  }

  const parts: T["parts"] = [];
  let hasProse = false;
  for (const part of last.parts) {
    if (part.type !== "text") {
      parts.push(part);
      continue;
    }
    const text = part.text.trimEnd();
    if (text.length > 0) {
      parts.push({ ...part, text, state: "done" });
      hasProse = true;
    }
  }
  if (!hasProse) {
    parts.push(stoppedTextPart<T>());
  }

  return [...messages.slice(0, -1), { ...last, parts }];
}
