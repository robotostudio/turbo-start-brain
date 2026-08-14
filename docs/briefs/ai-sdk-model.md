# Brief: Vercel AI SDK v7 — streaming chat + tool calling / RAG

Researched 2026-08-14 against npm, bundled `node_modules/ai/docs`, ai-gateway.vercel.sh model list, and platform.claude.com. Written for an implementation agent that will do no further research.

## 1. Exact versions (verified on npm 2026-08-14)

| Package | Version | Notes |
|---|---|---|
| `ai` | **7.0.65** | Core. ESM-only. Requires Node >= 22 (repo requires >= 22.12 — OK). Bundles `@ai-sdk/gateway` as a dependency, so `import { gateway } from 'ai'` works without installing it. |
| `@ai-sdk/react` | **4.0.68** | `useChat` etc. Peer: `react ^18 || ~19.0.1 || ~19.1.2 || ^19.2.1` — repo's react `^19.2.4` satisfies `^19.2.1`. |
| `@ai-sdk/anthropic` | **4.0.38** | Only needed for a **direct** Anthropic key (skip if using Gateway). |
| `@ai-sdk/gateway` | **4.0.52** | Optional explicit install; already a dep of `ai`. |

zod peer for `ai`/providers is `^3.25.76 || ^4.1.8`; repo catalog has `zod: ^4.3.6` — compatible, reuse `"zod": "catalog:"`.

**Warning: AI SDK v7 is NOT the v5 API you may remember.** Do not write v5/v6 patterns. Key renames are in §5.

### Install (repo convention: pnpm catalog)

Add to `pnpm-workspace.yaml` catalog:

```yaml
catalog:
  ai: ^7.0.65
  "@ai-sdk/react": ^4.0.68
  # only if using a direct Anthropic key instead of the Gateway:
  "@ai-sdk/anthropic": ^4.0.38
```

Then in `apps/web/package.json` dependencies: `"ai": "catalog:", "@ai-sdk/react": "catalog:"` and run `pnpm install` from repo root. (Or one-shot: `cd apps/web && pnpm add ai@^7.0.65 @ai-sdk/react@^4.0.68`, then move the versions into the catalog to match repo convention.)

## 2. Core mental model: UIMessage vs ModelMessage

- **`UIMessage`** — the client/persistence shape. Has `id`, `role`, and a **`parts` array** (no usable `content` string). Part types: `text`, `reasoning`, `file`, `source`, `tool-<toolName>` (typed per tool), `dynamic-tool`, `data-<name>` (custom data parts), `step-start`. This is what `useChat` gives you and what the client POSTs to the route.
- **`ModelMessage`** — what the LLM consumes. Convert on the server with `await convertToModelMessages(uiMessages)` (it is **async** in v7).
- The wire format server→client is the **UI Message Stream** (SSE). Build it with `toUIMessageStream({ stream: result.stream })` and return via `createUIMessageStreamResponse({ stream })`.

## 3. Canonical route handler (Next.js App Router)

`apps/web/src/app/api/chat/route.ts`:

```ts
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 30; // allow streaming up to 30s

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-5", // Gateway model string — see §7
    instructions: "You are the docs assistant for Turbo Start Brain.", // NOT `system`
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5), // multi-step tool loop (default isStepCount(20))
    tools: {
      searchDocs: tool({
        description: "Search the documentation and return matching pages as markdown.",
        inputSchema: z.object({ query: z.string() }), // NOT `parameters`
        execute: async ({ query }) => {
          // RAG retrieval — see §6
          return await searchSanityDocs(query);
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

Notes:

- `result.toUIMessageStreamResponse()` / `result.toDataStreamResponse()` are **deprecated (v6) / removed (v5-era name)** — use the stateless top-level helpers `toUIMessageStream` + `createUIMessageStreamResponse` as above.
- `instructions` replaces `system`. v7 **rejects `{ role: "system" }` entries inside `messages`** by default (opt out with `allowSystemInMessages: true`, only for trusted history).
- `result.fullStream` is now `result.stream`.
- The repo's `apps/web/src/proxy.ts` only rewrites `.md` / `Accept: text/markdown` requests; `/api/chat` is unaffected.

### Agent alternative (recommended for a reusable chat agent)

```ts
// e.g. apps/web/src/lib/ai/agent.ts
import { InferAgentUIMessage, ToolLoopAgent } from "ai";

export const docsAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-5",
  instructions: "...",
  tools: { searchDocs },
});
export type DocsAgentUIMessage = InferAgentUIMessage<typeof docsAgent>;

// route.ts
import { createAgentUIStreamResponse } from "ai";
export async function POST(request: Request) {
  const { messages } = await request.json();
  return createAgentUIStreamResponse({ agent: docsAgent, uiMessages: messages });
}
```

Client gets full tool-part typing via `useChat<DocsAgentUIMessage>()`.

## 4. Client: useChat (v7 shape)

`useChat` no longer manages input, and there is no `handleSubmit`/`handleInputChange`. You own the input state; send with `sendMessage`.

```tsx
"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useState } from "react";

export function Chat() {
  const { messages, sendMessage, status, stop, error, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }), // default is /api/chat
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls, // resubmit when client tool results land
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return; // ALWAYS narrow first, or TS errors on toolName
      // client-side auto-executed tools: call addToolOutput WITHOUT await
      // addToolOutput({ tool: "getLocation", toolCallId: toolCall.toolCallId, output: ... });
    },
  });
  const [input, setInput] = useState("");

  return (
    <>
      {messages.map((m) => (
        <div key={m.id}>
          {m.parts.map((part, i) => {
            if (part.type === "text") return <span key={i}>{part.text}</span>;
            if (part.type === "tool-searchDocs") {
              switch (part.state) {
                case "input-streaming": return <Spinner key={i} />;           // args streaming in
                case "input-available": return <Searching key={i} q={part.input} />;
                case "output-available": return <Sources key={i} data={part.output} />;
                case "output-error": return <ErrorNote key={i} text={part.errorText} />;
                default: return null; // also: approval-requested / approval-responded / output-denied
              }
            }
            return null;
          })}
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { sendMessage({ text: input }); setInput(""); } }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={status !== "ready"} />
      </form>
      {(status === "submitted" || status === "streaming") && <button onClick={() => stop()}>Stop</button>}
    </>
  );
}
```

- `status`: `"submitted" | "streaming" | "ready" | "error"`.
- Transport options: `DefaultChatTransport({ api, headers, body, credentials, prepareSendMessagesRequest })` — headers/body accept functions for dynamic values (auth, session ids, trimming to last N messages).
- Repo styling: build the component in `packages/ui` (Radix/Base-UI + CVA + Tailwind v4 conventions, `cn` from `@workspace/tailwind-config`), kebab-case filenames, Biome double-quotes.

## 5. v7 rename cheat-sheet (vs what you may have memorized)

| Old (v5/v6) | v7 |
|---|---|
| `system:` | `instructions:` |
| tool `parameters:` | `inputSchema:` |
| `stepCountIs(n)` / `maxSteps` | `stopWhen: isStepCount(n)` (default 20) |
| `onFinish` / `onStepFinish` | `onEnd` / `onStepEnd` |
| `result.fullStream` | `result.stream` |
| `result.toUIMessageStreamResponse()` | `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })` |
| `result.toTextStreamResponse()` | `createTextStreamResponse({ stream: toTextStream({ stream: result.stream }) })` |
| `useChat().input/handleSubmit` | gone — own the input, use `sendMessage({ text })` |
| `message.content` | `message.parts` array |
| `experimental_telemetry` | `telemetry` (OTel moved to `@ai-sdk/otel`) |
| `usage.cachedInputTokens` | `usage.inputTokenDetails.cacheReadTokens` |
| `Experimental_Agent` | `ToolLoopAgent` |

Migration codemod if ever needed: `npx @ai-sdk/codemod v7`.

## 6. Streaming structured data to the client (json-render pairing)

Two mechanisms, both arrive as typed entries in `message.parts`:

**a) Tool parts (automatic).** Every server tool call streams as `tool-<name>` parts with `state` transitions `input-streaming → input-available → output-available` (`part.input`, `part.output` are typed from the tool's schemas via `InferAgentUIMessage`). For json-render: render `part.output` (or partial `part.input` during `input-streaming`) straight into the component tree.

**b) Custom data parts (`data-*`) — the primary json-render channel.** Type the message, write parts server-side, reconcile by `id`:

```ts
// shared types
import type { UIMessage } from "ai";
export type BrainUIMessage = UIMessage<
  never, // metadata type
  { docCard: { title: string; href: string; status: "loading" | "ready" } } // data parts
>;

// route.ts
import { createUIMessageStream, createUIMessageStreamResponse, streamText, toUIMessageStream } from "ai";
const stream = createUIMessageStream<BrainUIMessage>({
  execute: ({ writer }) => {
    writer.write({ type: "data-docCard", id: "card-1", data: { title: "…", href: "…", status: "loading" } });
    const result = streamText({ /* … */,
      onEnd() {
        writer.write({ type: "data-docCard", id: "card-1", data: { title: "…", href: "…", status: "ready" } }); // same id ⇒ client updates in place
      },
    });
    writer.merge(toUIMessageStream({ stream: result.stream }));
  },
});
return createUIMessageStreamResponse({ stream });
```

- Same `id` ⇒ **reconciliation**: the client part object is replaced in place — ideal for progressively-built JSON UI (write the growing json-render spec under one id).
- `transient: true` ⇒ delivered only to `useChat`'s `onData` callback, never persisted into `message.parts` (status toasts, progress).
- Source parts for RAG citations: `writer.write({ type: "source", value: { type: "source", sourceType: "url", id, url, title } })` → render `part.type === "source-url"` on the client.
- Client render: `part.type === "data-docCard"` in the parts loop; `useChat<BrainUIMessage>()` types it.

### RAG retrieval options for this repo

The repo already serializes any page to Markdown (`pageBuilderToMarkdown`, `/api/markdown` route, `.md` URLs). Simplest robust RAG: a `searchDocs` server tool that GROQ-queries `doc`/`faq` documents (via `@workspace/sanity` client / `sanityFetch`) and returns the matched pages as Markdown — no vector store needed for a docs corpus this size. Options in ascending effort:

1. **GROQ text match** (`title match $q || pt::text(...) match $q`) — zero new infra.
2. **Sanity Embeddings Index API** — Sanity-hosted vectors over the dataset (project `63qexksi` per memory); query over HTTP with the read token.
3. **AI SDK embeddings** — `embed`/`embedMany` with `gateway.textEmbeddingModel("openai/text-embedding-3-small")` (Gateway serves embedding models too) + your own store. Overkill for now.

## 7. Model routing: AI Gateway vs direct provider key

**Recommended: Vercel AI Gateway.** In v7 the Gateway is the **default global provider** — a plain model string routes through it, zero provider package needed:

```ts
model: "anthropic/claude-sonnet-5"          // implicit gateway
// or explicit: import { gateway } from "ai"; model: gateway("anthropic/claude-sonnet-5")
```

- Auth: `AI_GATEWAY_API_KEY` env var (create at Vercel dashboard → AI Gateway → API keys), **or** zero-config Vercel OIDC when deployed on Vercel (local dev with OIDC: `vercel env pull` refreshes the token). Explicit `createGateway({ apiKey })` overrides both.
- Benefits: one key for all providers, failover/routing, usage tracking, embeddings via the same key.
- Gateway Anthropic ids use **dots** (verified from `https://ai-gateway.vercel.sh/v1/models` 2026-08-14): `anthropic/claude-sonnet-5`, `anthropic/claude-haiku-4.5`, `anthropic/claude-opus-5`, `anthropic/claude-fable-5`.

**Direct Anthropic** (only if the user prefers their own Anthropic key):

```ts
import { anthropic } from "@ai-sdk/anthropic"; // reads ANTHROPIC_API_KEY
model: anthropic("claude-sonnet-5")
```

**Verified Claude model ids (platform.claude.com, 2026-08-14)** — direct API uses **dashes**:

| Model | Claude API id | Gateway id | Pricing (in/out per MTok) | Fit |
|---|---|---|---|---|
| Claude Sonnet 5 | `claude-sonnet-5` | `anthropic/claude-sonnet-5` | $2 / $10 | **Recommended** — fast, 1M ctx, adaptive thinking |
| Claude Haiku 4.5 | `claude-haiku-4-5` | `anthropic/claude-haiku-4.5` | $1 / $5 | Cheapest/fastest, 200k ctx — fine for docs Q&A |
| Claude Opus 5 | `claude-opus-5` | `anthropic/claude-opus-5` | $5 / $25 | Overkill for docs chat |

Recommendation: `anthropic/claude-sonnet-5` default, optionally `anthropic/claude-haiku-4.5` for a cheap mode.

## 8. Env vars: what the user must supply + where to register (NOTHING is configured today)

**No AI key of any kind exists in this repo.** The user must supply exactly one of:

- `AI_GATEWAY_API_KEY` — recommended (Gateway path; not needed at runtime on Vercel if relying on OIDC, but set it anyway for local dev), **or**
- `ANTHROPIC_API_KEY` — direct-provider path (requires adding `@ai-sdk/anthropic`).

Registration points (all three needed):

**a) `turbo.json` `globalEnv`** — current shape (quoted verbatim; append the new key(s) here or turbo cache-poisons/strips them):

```json
"globalEnv": [
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET",
  "NEXT_PUBLIC_SANITY_API_VERSION",
  "NEXT_PUBLIC_SANITY_STUDIO_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_URL",
  "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
  "SANITY_API_READ_TOKEN",
  "SANITY_API_WRITE_TOKEN",
  "SANITY_REVALIDATE_SECRET",
  "SANITY_STUDIO_PROJECT_ID",
  "SANITY_STUDIO_DATASET",
  "SANITY_STUDIO_TITLE",
  "SANITY_STUDIO_API_VERSION",
  "SANITY_STUDIO_PRESENTATION_URL",
  "SANITY_STUDIO_APP_ID",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_ENV",
  "NODE_ENV"
]
```

→ add `"AI_GATEWAY_API_KEY"` (and/or `"ANTHROPIC_API_KEY"`).

**b) `packages/env/src/server.ts`** — current server block (verbatim; uses `@t3-oss/env-nextjs` `createEnv`, imports `z` from `"zod/v4"`, extends the `vercel()` preset):

```ts
server: {
  SANITY_API_READ_TOKEN: z.string().min(1),
  SANITY_API_WRITE_TOKEN: z.string().min(1),
  // Shared secret for the `/api/revalidate-sync-tags` webhook. Optional so
  // existing deployments still boot; the webhook fails closed when unset.
  SANITY_REVALIDATE_SECRET: z.string().min(1).optional(),
},
```

→ add `AI_GATEWAY_API_KEY: z.string().min(1).optional(),` (**make it `.optional()`** — `apps/web/next.config.ts` imports `@workspace/env/server`, so a required var breaks `next dev`/`next build` for everyone without the key; the chat route should fail closed at request time instead, mirroring the `SANITY_REVALIDATE_SECRET` pattern). Server vars need no `experimental__runtimeEnv` entry (that object only mirrors `shared`/client vars — see current file). Client file `packages/env/src/client.ts` needs no change (no `NEXT_PUBLIC_` AI vars).

**c) `apps/web/.env.example`** — repo docs call this the canonical env source; append `AI_GATEWAY_API_KEY=` with a comment. User then sets it in `apps/web/.env` locally and in Vercel project env for deploys.

Note: the AI SDK reads `AI_GATEWAY_API_KEY`/`ANTHROPIC_API_KEY` from `process.env` itself; routing it through `@workspace/env` is for repo-consistent validation, so in the route prefer `env.AI_GATEWAY_API_KEY` presence-check → 503 with a clear message when unset.

## 9. Gotchas checklist

- ESM-only (`ai` v7): fine — `apps/web` is ESM/Next 16.
- `convertToModelMessages` is async — `await` it.
- Always check `toolCall.dynamic` before `toolCall.toolName` in `onToolCall`; call `addToolOutput` without `await`.
- Handle tool part states exhaustively incl. `approval-requested`/`approval-responded`/`output-denied` (exist even without approvals).
- Multi-step: without `stopWhen`, tool loop defaults to `isStepCount(20)`; set an explicit bound.
- `maxDuration` export on the route for Vercel function limits; docs examples use 30.
- Biome `noConsole: warn` — use `@workspace/logger` in the route/tools.
- Tool descriptions + zod `.describe()` matter for call quality; keep tool outputs small (markdown snippets, not whole pages) to control Sonnet input cost.
- DevTools for local debugging: `npx @ai-sdk/devtools` (optional, dev-only).

## Links

- Migration v6→v7: https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- Chatbot / useChat: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
- Tool usage: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
- Streaming custom data (data parts): https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data
- Transport: https://ai-sdk.dev/docs/ai-sdk-ui/transport
- Agents: https://ai-sdk.dev/docs/agents/building-agents
- AI Gateway models: https://ai-gateway.vercel.sh/v1/models · docs: https://vercel.com/docs/ai-gateway
- Claude models: https://platform.claude.com/docs/en/about-claude/models/overview
