import { pipeJsonRender } from "@json-render/core";
import { env } from "@workspace/env/server";
import { Logger } from "@workspace/logger";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  type ModelMessage,
  streamText,
  type SystemModelMessage,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { docsCatalog } from "@/lib/ai/catalog";
import {
  CHAT_ERROR,
  chatErrorBody,
  chatErrorResponse,
  streamErrorCode,
} from "@/lib/ai/chat-errors";
import { getDocsCorpus } from "@/lib/ai/corpus";

export const maxDuration = 30;

const logger = new Logger("ChatRoute");

// A/B-able without a redeploy (Haiku vs Sonnet): set CHAT_MODEL in the Vercel
// project. Gateway model ids, not first-party Anthropic ids.
const DEFAULT_CHAT_MODEL = "anthropic/claude-haiku-4.5";

const BASE_INSTRUCTIONS = `You are the docs assistant for Turbo Start Brain, a documentation site.

The complete documentation corpus is included in your instructions. It is everything you know and the only thing you may answer from. You have no search or retrieval tools — never say you are looking something up, searching, or fetching a page.

Two rules hold for every answer, including ones where the question never mentions pages:

1. LINK YOUR SOURCES INLINE. Every document in the corpus opens with an envelope line of the form "=== /slug — Title ===". The first time an answer leans on a page, link it in the prose as [Page Title](/slug), using only slugs that appear in such a line. Copy the slug whole, character for character, including every path segment: most slugs are nested, and "/delivery/migration-playbook" shortened to "/migration-playbook" is a broken link. Never invent, guess, abbreviate, or reshape a slug. An answer built from the corpus that contains no links is a wrong answer, however good the prose is.
2. CLOSE WITH DOC CARDS whenever the answer drew on two or more pages: prose first, then the \`\`\`spec fence described in the UI instructions below. The test is mechanical — count the distinct page links your prose contains, and if there are two or more, the fence is required. The cards repeat those sources, they do not replace the inline links.

Beyond those:

- Answer only from the corpus. If it does not cover the question, say so plainly and point at the closest page or suggest a broader question. Never invent content, product behaviour, or page names.
- Only answer questions about this documentation and the product it documents. For anything off-topic — general knowledge, other products, coding help unrelated to these docs, chit-chat — say that you only cover this knowledge base and stop. Do not answer from outside knowledge.
- Keep answers concise and grounded: lead with the direct answer, then add only the detail the question needs.`;

// json-render doc-card spec instructions (inline mode: prose first, then
// JSONL patches). Built once — the catalog is static.
//
// The generated prompt is a general-purpose UI-generator brief: most of it
// (state, actions, events, repeat, sample data) is irrelevant to a two-
// component catalog and reads as an instruction to build dashboards. Haiku
// followed the "no UI needed" escape hatch every time until the rules below
// were made explicit about (a) it being mandatory and (b) how small a correct
// spec is. Keep them concrete if you touch them.
const DOC_CARDS_PROMPT = docsCatalog.prompt({
  mode: "inline",
  system:
    "The rest of this section is the UI-spec contract for the doc cards that close an answer. It is not a licence to build dashboards: this catalog has exactly two components and no state, actions, events, repeat or sample data, so ignore every instruction below about those.",
  customRules: [
    "A correct spec is short — one /root line, one DocCardScroller element, one line per DocCard. Never emit /state patches, repeat, visible, on or watch: this catalog has no state and no actions.",
    'Complete example of a correct fence:\n```spec\n{"op":"add","path":"/root","value":"cards"}\n{"op":"add","path":"/elements/cards","value":{"type":"DocCardScroller","props":{},"children":["card-1","card-2"]}}\n{"op":"add","path":"/elements/card-1","value":{"type":"DocCard","props":{"title":"Migration playbook","description":"How a replatform is sequenced, from audit to cutover.","section":"Delivery","href":"/delivery/migration-playbook"},"children":[]}}\n{"op":"add","path":"/elements/card-2","value":{"type":"DocCard","props":{"title":"Open source","description":"The projects the studio maintains in public.","section":"Handbook","href":"/handbook/open-source"},"children":[]}}\n```',
    'DocCard props come from the page itself: "href" is a slug present in the corpus, copied from its envelope line (the line "=== /delivery/migration-playbook — Migration playbook ===" makes href "/delivery/migration-playbook" and title "Migration playbook" valid); "section" is the first slug segment as a readable name ("Delivery"); "description" is one short sentence of your own about what that page covers. Never invent or guess an href.',
    "For a single-page answer, a refusal, or a question the corpus does not cover, emit no fence and no UI at all.",
    "MANDATORY: when your answer draws on 2 or more docs pages — that is, whenever the prose you just wrote links two or more distinct slugs — the reply MUST end with a ```spec fence holding exactly one DocCardScroller whose children are up to 3 DocCards, one per page the answer leaned on most. Check before you finish: two or more links and no fence is a failed answer.",
  ],
});

// Byte-stable and volatile-free: this is the cached prefix, and a single
// changed byte (a date, a request id, unsorted JSON) invalidates the whole
// Anthropic cache entry behind it.
const STATIC_INSTRUCTIONS = `${BASE_INSTRUCTIONS}\n\n${DOC_CARDS_PROMPT}`;

export async function POST(req: Request) {
  // Fail closed: without the Gateway key the model call cannot succeed.
  if (!env.AI_GATEWAY_API_KEY) {
    logger.warn("Rejected chat request: AI_GATEWAY_API_KEY is not configured");
    return chatErrorResponse(CHAT_ERROR.notConfigured, 503);
  }

  let messages: UIMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: UIMessage[] });
  } catch {
    return chatErrorResponse(CHAT_ERROR.invalidBody, 400);
  }
  if (!Array.isArray(messages)) {
    return chatErrorResponse(CHAT_ERROR.invalidBody, 400);
  }

  let modelMessages: ModelMessage[];
  try {
    // `ignoreIncompleteToolCalls` drops half-finished tool parts instead of
    // throwing. This route emits no tools, but a tab left open across the
    // deploy that removed them still holds such parts in memory, and those
    // histories should degrade rather than 400 until the tab is reloaded.
    modelMessages = await convertToModelMessages(messages, {
      ignoreIncompleteToolCalls: true,
    });
  } catch (error) {
    logger.warn("Rejected chat request: unusable message history", { error });
    return chatErrorResponse(CHAT_ERROR.invalidBody, 400);
  }

  // Fail closed on any corpus failure: answering with an empty knowledge base
  // is worse than an error. The `use cache` boundary can reshape the thrown
  // error, so the cause is logged rather than matched on.
  let corpus: string;
  try {
    corpus = await getDocsCorpus();
  } catch (error) {
    logger.error("Corpus unavailable; refusing to answer", { error });
    return chatErrorResponse(CHAT_ERROR.corpusUnavailable, 503);
  }

  // Object form, not a string: only a SystemModelMessage can carry
  // providerOptions. Exactly one cache breakpoint, on the last system message,
  // so the cached prefix covers the static instructions *and* the corpus.
  const instructions: SystemModelMessage[] = [
    { role: "system", content: STATIC_INSTRUCTIONS },
    {
      role: "system",
      content: corpus,
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
  ];

  const result = streamText({
    model: env.CHAT_MODEL ?? DEFAULT_CHAT_MODEL,
    instructions,
    messages: modelMessages,
    // Cancels the model call when the client goes away — which is what stops
    // the tokens (and the spend). Caveat: on Vercel `req.signal` only aborts
    // for functions that opt in with `supportsCancellation` in `vercel.json`,
    // and this repo has no `vercel.json`. So today this is live in local dev,
    // while in production `stop()` ends the client stream and the Gateway
    // generation runs to completion. Adding that config is a deploy-config
    // change, deliberately not bundled with this rewrite.
    abortSignal: req.signal,
    onAbort: () => {
      logger.info("Chat stream aborted by the client");
    },
    onError: ({ error }) => {
      logger.error("Chat stream error", { error });
    },
    onEnd: ({ usage }) => {
      // Cache health: cacheReadTokens should be ~the corpus size on every
      // request after the first. Zero across repeats means a prefix
      // invalidator crept in.
      logger.info("Chat stream finished", {
        cacheReadTokens: usage.inputTokenDetails.cacheReadTokens,
        cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens,
        noCacheTokens: usage.inputTokenDetails.noCacheTokens,
        outputTokens: usage.outputTokens,
      });
    },
  });

  return createUIMessageStreamResponse({
    stream: pipeJsonRender(
      toUIMessageStream({
        stream: result.stream,
        onError: (error) => chatErrorBody(streamErrorCode(error)),
      })
    ),
    // Keeps the server-side stream drained when the client disconnects
    // mid-flight, so an aborted request tears down instead of hanging.
    consumeSseStream: consumeStream,
  });
}
