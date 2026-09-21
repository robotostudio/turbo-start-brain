/**
 * Machine-readable failure codes the chat route hands the client. They travel
 * as a JSON body (`{"code":"…"}`) on rejected requests and as the error
 * message on an already-open stream, so one `JSON.parse` on the client covers
 * both paths. Prettifying them into human copy is a later ticket.
 */
export const CHAT_ERROR = {
  /** No `AI_GATEWAY_API_KEY` — the model call cannot succeed. */
  notConfigured: "chat_not_configured",
  /** The Knowledge Base or the page index was unreachable; answering would be improvisation. */
  corpusUnavailable: "corpus_unavailable",
  /** Request body was not a usable `{ messages: UIMessage[] }`. */
  invalidBody: "invalid_body",
  /** AI Gateway rejected the call because a spend budget is exhausted. */
  budgetExhausted: "budget_exhausted",
  /** Anything else that broke mid-stream. */
  streamFailed: "chat_stream_failed",
} as const;

export type ChatErrorCode = (typeof CHAT_ERROR)[keyof typeof CHAT_ERROR];

/** Serializes a code for a `Response` body or an in-stream error message. */
export function chatErrorBody(code: ChatErrorCode): string {
  return JSON.stringify({ code });
}

/** Builds the JSON error `Response` for a request rejected before streaming. */
export function chatErrorResponse(
  code: ChatErrorCode,
  status: number
): Response {
  return new Response(chatErrorBody(code), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// AI Gateway rejects a request that would cross a spend budget with HTTP 402
// and `error.type: "quota_for_entity_exceeded"`. The gateway provider maps
// unknown wire types onto GatewayInternalServerError, which drops the wire
// `type`, so the original payload has to be read off the cause chain. Both
// signals below are structured fields — never the message string, which is
// free-form English and includes a dollar figure.
const QUOTA_EXCEEDED_TYPE = "quota_for_entity_exceeded";
const PAYMENT_REQUIRED = 402;
const MAX_CAUSE_DEPTH = 8;

/** Reads `error.type` out of a Gateway error payload (object or JSON string). */
function payloadErrorType(payload: unknown): string | undefined {
  if (typeof payload === "string") {
    try {
      return payloadErrorType(JSON.parse(payload));
    } catch {
      return;
    }
  }
  if (typeof payload !== "object" || payload === null) {
    return;
  }
  const { error } = payload as { error?: unknown };
  if (typeof error !== "object" || error === null) {
    return;
  }
  const { type } = error as { type?: unknown };
  return typeof type === "string" ? type : undefined;
}

function isBudgetRejection(node: object): boolean {
  const candidate = node as {
    statusCode?: unknown;
    data?: unknown;
    responseBody?: unknown;
  };
  if (
    payloadErrorType(candidate.data) === QUOTA_EXCEEDED_TYPE ||
    payloadErrorType(candidate.responseBody) === QUOTA_EXCEEDED_TYPE
  ) {
    return true;
  }
  return candidate.statusCode === PAYMENT_REQUIRED;
}

/**
 * Classifies an error raised while the model stream was already open. Walks
 * the `cause` chain because the AI SDK wraps the raw `APICallError` (which
 * carries the status code and response payload) inside a `GatewayError`.
 */
export function streamErrorCode(error: unknown): ChatErrorCode {
  let node: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof node !== "object" || node === null) {
      break;
    }
    if (isBudgetRejection(node)) {
      return CHAT_ERROR.budgetExhausted;
    }
    node = (node as { cause?: unknown }).cause;
  }
  return CHAT_ERROR.streamFailed;
}

const CHAT_ERROR_CODES: readonly string[] = Object.values(CHAT_ERROR);

/**
 * Recovers the code from what `useChat` surfaces as `error.message` — the JSON
 * body on a rejected request, or the in-stream `errorText`. Returns
 * `undefined` for anything that is not one of ours (a dropped connection, say),
 * so the caller can tell "the route said no" from "the network did".
 *
 * The client needs this to keep the raw `{"code":"…"}` off the screen; turning
 * codes into designed copy is a later ticket.
 */
export function parseChatErrorCode(
  message: string | undefined
): ChatErrorCode | undefined {
  if (!message) {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return;
  }
  const { code } = parsed as { code?: unknown };
  return typeof code === "string" && CHAT_ERROR_CODES.includes(code)
    ? (code as ChatErrorCode)
    : undefined;
}
