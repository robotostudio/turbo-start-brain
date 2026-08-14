# Brief: Sanity Context as the retrieval layer for AI docs chat

Researched 2026-08-14 against live Sanity docs + npm. For an implementation agent — no further research needed.

## TL;DR

**Sanity Context is a hosted, read-only MCP server** (not an SDK, not a REST retrieval API) that Sanity runs at `api.sanity.io`. You point an MCP client (AI SDK `createMCPClient`) at a per-project/dataset URL, authenticate with a plain **Sanity API read token as a Bearer header**, and the LLM gets 4 tools (`initial_context`, `schema_explorer`, `groq_query`, `array_field_reader`) to query the dataset itself with GROQ — agentic retrieval, not classic embed-chunk-topK RAG. It is **GA and available on all Sanity plans**; tool calls are billed as ordinary Sanity API requests (no AI surcharge). Optional **dataset embeddings** (paid add-on via AI credits, per dataset, off by default) unlock semantic search via `text::semanticSimilarity()` inside `groq_query`. This is viable today for this repo — Studio v6 satisfies the "Studio ≥ 5.1.0" requirement; the only hard prerequisites are a **deployed schema** (`sanity schema deploy`) and the read token the web app already has (`SANITY_API_READ_TOKEN`).

## What it is / isn't

- **Is**: hosted MCP endpoint, schema-aware, read-only, scoped by a "Sanity Context" config document (or URL params). The agent writes its own GROQ queries against your schema.
- **Isn't**: a vector-DB/RAG API returning chunks, a writable MCP (that's the separate Sanity MCP Server), or an agent runtime (you bring the loop — Vercel AI SDK here).
- Docs: https://www.sanity.io/docs/ai/sanity-context (setup) and https://www.sanity.io/docs/ai/sanity-context-patterns (production patterns). Marketing: https://www.sanity.io/context. Official setup skill: `pnpm dlx skills add sanity-io/context --all` (installs `create-agent-with-sanity-context`, `shape-your-agent`, `dial-your-context`). Reference impl: https://github.com/sanity-labs/starters/tree/main/ai-shopping-assistant

## Endpoint & auth

```text
# With a Sanity Context document (recommended, config lives in Studio):
https://api.sanity.io/:apiVersion/context/mcp/:projectId/:dataset/:slug
# Without a document (all config via URL params):
https://api.sanity.io/:apiVersion/context/mcp/:projectId/:dataset
# Initial-context (system-prompt injection, append before query params):
.../:slug/initial-context
```

- `:apiVersion` = `vYYYY-MM-DD`, docs use `v2026-02-27`. For this repo: `projectId=63qexksi`, `dataset=production`.
- **Gotcha**: the patterns doc shows an older path `https://api.sanity.io/v2026-03-03/agent-context/:projectId/:dataset/:slug`. The canonical current path per the main doc is `context/mcp/...`. Verify at implementation time with the smoke test below; if `context/mcp` 404s, try `agent-context`.
- **Auth**: `Authorization: Bearer <SANITY_API_READ_TOKEN>` on every request. Read token only, **server-side only** — browser talks to your route handler, never to the MCP URL. Repo already validates `SANITY_API_READ_TOKEN` in `packages/env/src/server.ts`.
- URL query params (override document config per request): `instructions`, `groqFilter`, `perspective` (`published` default, `drafts` to include drafts), `embeddings=true`, `workspace`.

Smoke test (should return `result.tools` with 4 tools; 401 = bad token, 400 = bad groqFilter):

```sh
curl -X POST "https://api.sanity.io/v2026-02-27/context/mcp/63qexksi/production/docs-assistant" \
  -H "Authorization: Bearer $SANITY_API_READ_TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## The 4 tools

| Tool | Purpose |
| --- | --- |
| `initial_context` | Compressed schema overview + document instructions. Replaceable by the `/initial-context` HTTP endpoint (do this — saves a tool call/latency; then strip it from the tools object) |
| `schema_explorer` | Detailed schema for one type (fields, references) |
| `groq_query` | Runs GROQ (subject to `groqFilter`); supports `text::semanticSimilarity` when embeddings on |
| `array_field_reader` | Reads large arrays / Portable Text body from a single document — this is how the agent reads a `doc`'s `body` |

## Studio side (apps/studio)

Package: **`@sanity/context@1.0.0`** (deps: `groq-js`; peers: `sanity ^6`, `react ^19`, `zod ^3.20 || ^4` — all satisfied by the repo; **also peers `ai: ^6.0.175`**, see version-matrix gotcha below).

```sh
pnpm --filter studio add @sanity/context
```

```ts
// apps/studio/sanity.config.ts
import { contextPlugin } from "@sanity/context/studio";
// plugins: [...existing, contextPlugin()]
// Optional structure placement via CONTEXT_SCHEMA_TYPE_NAME export.
```

Then in Studio create + **publish** (drafts don't work) a Sanity Context document:

- `name`: "Docs Assistant"; `slug`: `docs-assistant` (becomes the URL segment; keep stable)
- `groqFilter`: `_type == "doc" && hidden != true` — this is the **security boundary**; filter expression only (no `*[...]`, projections, `order()`, slices; only `==,!=,<,>,<=,>=,&&,||,in,defined()`)
- `instructions`: domain knowledge the schema can't express, e.g.: slugs are nested paths (`getting-started/setup`); page content lives in the `body` Portable Text field — use `array_field_reader` or `pt::text(body)`; cite pages by slug so the UI can link `/{slug}`; use `text::semanticSimilarity()` for conceptual queries; if nothing found, say so — don't guess.

**Must run `sanity schema deploy`** (from `apps/studio`) — Context reads the server-side schema, not local files. Studio ≥ 5.1.0 required (repo is on `sanity ^6.1.0` ✓).

## Next.js route handler (apps/web) with AI SDK

### Packages + versions (verified on npm 2026-08-14)

Two coherent lines — **pick one**:

| Package | `latest` (AI SDK v7) | `ai-v6` tag (AI SDK v6) |
| --- | --- | --- |
| `ai` | 7.0.65 | 6.0.255 |
| `@ai-sdk/mcp` | 2.0.31 | 1.0.70 |
| `@ai-sdk/anthropic` | 4.0.38 | 3.0.110 |
| `@ai-sdk/react` (chat UI) | 4.0.68 | 3.0.258 |

- `createMCPClient` exists in **both** lines with identical usage (verified in `@ai-sdk/mcp@2.0.31` d.ts: `transport: { type: 'http' | 'sse', url, headers }`). Sanity's own examples use it. `@ai-sdk/mcp` peers `zod ^3.25.76 || ^4.1.8` — repo catalog has `zod ^4.3.6` ✓.
- **Version-matrix gotcha**: `@sanity/context@1.0.0` peer-depends on `ai ^6.0.175` (used by its `@sanity/context/ai-sdk` Insights telemetry entry). If you want **Sanity Context Insights** (conversation tracking/classification, `@sanity/context/ai-sdk`), use the **v6 line**. If you skip Insights, v7 `latest` is fine — the studio plugin never imports `ai` at runtime; silence the pnpm peer warning with a `peerDependencyRules.allowedVersions` entry (`"@sanity/context>ai": ">=6"`) in `pnpm-workspace.yaml`, matching the repo's existing pattern.
- Recommended install (v7 line, adding to catalog is optional since only `apps/web` uses them):

```sh
pnpm --filter web add ai@7.0.65 @ai-sdk/mcp@2.0.31 @ai-sdk/anthropic@4.0.38 @ai-sdk/react@4.0.68
```

- Anthropic key: `ANTHROPIC_API_KEY` — add to `packages/env/src/server.ts` (Zod-validated) + `apps/web/.env.example` + shelve.cloud. Alternatively route via Vercel AI Gateway (`AI_GATEWAY_API_KEY`, model string `"anthropic/claude-sonnet-4-5"`, no provider pkg needed).

### Route (adapted to repo conventions — kebab-case, Biome double quotes, `@workspace/env`)

```ts
// apps/web/src/app/api/chat/route.ts
import { createMCPClient } from "@ai-sdk/mcp";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const MCP_URL =
  "https://api.sanity.io/v2026-02-27/context/mcp/63qexksi/production/docs-assistant";
// Build from env.NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET in real code.

const SYSTEM_PROMPT = `You are the Turbo Start Brain docs assistant...
- Answer only from retrieved content; use the Sanity tools for every factual claim.
- Cite pages as markdown links: /{slug}.
- If retrieval returns nothing, say so and suggest broadening. Never invent.`;

// Optional latency win: fetch `${MCP_URL}/initial-context` (same Bearer header),
// cache it ("use cache" + cacheLife), append to SYSTEM_PROMPT, and strip the
// initial_context tool: const { initial_context: _, ...tools } = allTools;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const mcp = await createMCPClient({
    transport: {
      type: "http",
      url: MCP_URL,
      headers: {
        Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
      },
    },
  });
  const tools = await mcp.tools();

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: ({ steps }) => steps.length >= 8, // multi-step tool use
    onFinish: () => mcp.close(),
  });

  return result.toUIMessageStreamResponse();
}
```

Client side: `useChat` from `@ai-sdk/react` pointed at `/api/chat` (`DefaultChatTransport({ api: "/api/chat" })` in v6/v7). Build the panel with `@workspace/ui` primitives; note **CLAUDE.md says Radix, but newer repo guidance says Base UI** — follow whatever `packages/ui` currently uses.

### Repo/runtime gotchas

- Route handlers are dynamic by default — no Cache Components conflict; do NOT put `"use cache"` on the POST. Fine to cache the `/initial-context` fetch in a helper.
- Keep the MCP client per-request (as above); it's HTTP, cheap to create, and `onFinish: () => mcp.close()` avoids leaks.
- Every connected MCP's tool definitions bill tokens each turn — Context alone is only 4 tools (3 after stripping `initial_context`), fine.
- Re-describing tools is allowed and useful: `tools()` returns a plain object; you can rename/re-describe `groq_query` (e.g. "Query the Turbo Start Brain docs...") before passing to `streamText`.
- `groqFilter` is enforced server-side by Sanity — a misrouted/hostile query cannot escape it. Don't rely on system prompt alone.
- Drafts: default perspective is `published`. For a draft-mode-aware assistant pass `?perspective=drafts` (token must read drafts — the repo's read token is a viewer token, verify).
- 401 = token missing/wrong header; 403 = token lacks dataset read; empty schema = run `sanity schema deploy`; tools missing = document not **published** or slug missing from URL.

## Semantic search (recommended add-on)

Enable embeddings on the dataset so `groq_query` can rank by meaning ("how do I add a block?" vs keyword miss):

```sh
# from apps/studio (sanity CLI, project 63qexksi)
pnpm sanity datasets embeddings enable production \
  --projection='{ _type == "doc" => { title, description, "body": body } }'
pnpm sanity datasets embeddings status production   # wait for "ready"
```

- Then pass `?embeddings=true` on the MCP URL (or use a token with `datasets/read` grant for auto-detect), and mention `text::semanticSimilarity()` in the Context document's `instructions` (smaller models won't reach for it unprompted).
- GROQ usage: `*[_type == "doc"] | score(text::semanticSimilarity("query"))`; hybrid: `score([title, "body"] match text::query("..."), text::semanticSimilarity("..."))` with `boost()` to rebalance. Results carry `_score` + `_embeddings` fragments (usable for citations/highlighting).
- **Pricing**: base Sanity Context is included on all plans (tool calls billed as normal API requests). Dataset embeddings are the paid part — per dataset, via AI credits; costs scale with projected content size. Chunk limit: max ~10 chunks/document, overflow is silently dropped — the projection above (title+description+body) keeps docs within range; long pages may truncate tail content.
- Caveats: initial generation takes minutes; updates async (~<1 min lag); write speeds can slow on embeddings-enabled datasets; disabling deletes vectors (destructive).

## Fallback if Context endpoint is unavailable/immature

Confidence is high that Context works (GA, on all plans, official AI SDK examples), but the fallback is cheap because the repo already has the pieces:

1. **Fuse.js search as an AI SDK tool** — `apps/web/src/app/api/docs/search/route.ts` already builds a Fuse index over `querySearchDocs` (`packages/sanity/src/query.ts:155`: `_type == "doc" && defined(slug.current) && hidden != true` projecting `title, description, slug, "content": pt::text(body)`). Extract its search logic into a shared function and expose it to `streamText` as a `tool({ inputSchema: z.object({ query: z.string() }) })` returning top-N `{ slug, title, snippet }`, plus a second `read_doc` tool that fetches one doc's full `pt::text(body)` (or the existing `.md` markdown-negotiation output — `GET https://<site>/<slug>.md` — which is ideal LLM context and already built).
2. **Embeddings without Context** — enable dataset embeddings as above and call `text::semanticSimilarity()` yourself via the repo's `sanityFetch`/client inside a custom tool; no MCP involved. (The legacy Embeddings Index API still exists but dataset embeddings + GROQ is the current path.)

Either way the agent loop, route shape, and UI are identical — only the `tools` object changes, so build the route so tools are injectable.

## Links

- Sanity Context docs: https://www.sanity.io/docs/ai/sanity-context
- Patterns & best practices: https://www.sanity.io/docs/ai/sanity-context-patterns
- Insights (conversation analytics): https://www.sanity.io/docs/ai/sanity-context-insights
- Dataset embeddings: https://www.sanity.io/docs/content-lake/dataset-embeddings
- Announcement: https://www.sanity.io/blog/introducing-agent-context
- E-commerce walkthrough: https://www.sanity.io/sanity-context-ecommerce
- Starter repo: https://github.com/sanity-labs/starters/tree/main/ai-shopping-assistant
- npm: [`@sanity/context`](https://www.npmjs.com/package/@sanity/context) 1.0.0, [`@sanity/agent-directives`](https://www.npmjs.com/package/@sanity/agent-directives) 0.2.2 (structured-result → UI rendering helper), [`@ai-sdk/mcp`](https://www.npmjs.com/package/@ai-sdk/mcp) 2.0.31
