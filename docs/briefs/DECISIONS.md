# DECISIONS — Turbo Start Brain: Next.js bump + AI docs chat

Synthesized 2026-08-14 from the six briefs in this folder, `CLAUDE.md`, and the
session handoff. This is the single implementation-ready plan; the briefs are
the evidence. Where briefs disagreed, the resolution and reason are stated
inline. Versions were all verified on npm 2026-08-14.

---

## 1. The chosen stack (one stack, overlaps resolved)

### Resolution of the shadcn-Base / AI Elements / Streamdown overlap

| Concern | Winner | Loser (and why) |
|---|---|---|
| Chat transcript scroll container | **shadcn Base `message-scroller`** | AI Elements `Conversation` (`use-stick-to-bottom` wrapper) — message-scroller is strictly more capable (anchored turns, history prepend, restore, jump-to-message) and Base UI-native. Do NOT install `use-stick-to-bottom`. |
| Message row / bubble layout | **shadcn Base `message` + `bubble`** | Elements `Message`/`MessageContent` — shadcn variants are Base-flavored and land via the repo's own components.json. |
| Streaming markdown rendering | **`streamdown` core + `@streamdown/code`**, exposed via a vendored `MessageResponse` (the thin memoized `<Streamdown>` wrapper copied from the Elements `message` registry item) | Elements' full `message` item — we take only the ~20-line `MessageResponse` and strip `MessageActions`/`MessageBranch*`/`MessageToolbar` (they need Tooltip/ButtonGroup which `packages/ui` doesn't have). Skip `@streamdown/math`/`mermaid`/`cjk` (bundle weight, docs answers don't need them). |
| Prompt composer | **Compose ourselves from shadcn Base `input-group` + textarea + existing `Button`** | Elements `PromptInput` — heavy Radix-flavored regdeps (command, dropdown-menu, hover-card, select…); we need no model picker or attachments in v1. |
| Structured doc cards | **`@json-render/core` + `@json-render/react` 0.19.0**, inline mode | `@json-render/shadcn` (36 foreign styled components — fights `@workspace/ui`); plain data-parts alternative kept as documented fallback (§1.4). |
| Agent loop / streaming protocol | **AI SDK v7 (`ai` 7.0.65)** | AI SDK v6 line — only needed for Sanity Context *Insights* telemetry, which we skip (see §2). The v7 API surface in the `ai-sdk-model` brief is authoritative; ignore the v6-flavored route sketch in the `sanity-context` brief (`system:`, `result.toUIMessageStreamResponse()` are v6isms). |

### 1.1 Exact packages + versions

npm runtime deps:

| Package | Version | Workspace |
|---|---|---|
| `ai` | ^7.0.65 | apps/web (via catalog) |
| `@ai-sdk/react` | ^4.0.68 | apps/web (via catalog) |
| `@ai-sdk/mcp` | ^2.0.31 | apps/web (via catalog) |
| `@json-render/core` / `@json-render/react` | ^0.19.0 | apps/web (via catalog) |
| `streamdown` | ^2.5.0 | packages/ui |
| `@streamdown/code` | ^1.1.1 | packages/ui |
| `@shadcn/react` | ^0.3.0 | packages/ui (added by CLI) |
| `shadcn` | ^4.18.0 | packages/ui (runtime dep for `shadcn/tailwind.css` only) |
| `@sanity/context` | 1.0.0 | apps/studio |

Not installed: `@ai-sdk/anthropic` (Gateway path — only add if the user picks a
direct Anthropic key), `use-stick-to-bottom`, `@streamdown/{math,mermaid,cjk}`,
`shiki` (bundled by `@streamdown/code`), `ai-elements`/`shadcn` CLIs as deps
(dlx only).

Model: **`anthropic/claude-sonnet-5` via Vercel AI Gateway** (implicit default
provider in v7 — plain model string, no provider package). $2/$10 per MTok,
1M context. Optional cheap mode later: `anthropic/claude-haiku-4.5`.
Gateway ids use dots; direct-API ids use dashes (`claude-sonnet-5`).

### 1.2 Catalog additions (`pnpm-workspace.yaml`)

```yaml
catalog:
  ai: ^7.0.65
  "@ai-sdk/react": ^4.0.68
  "@ai-sdk/mcp": ^2.0.31
  "@json-render/core": ^0.19.0
  "@json-render/react": ^0.19.0
```

Plus a peer-warning silencer for the ai-v7-vs-@sanity/context matrix (matches
the repo's existing `peerDependencyRules` pattern):

```yaml
peerDependencyRules:
  allowedVersions:
    "@sanity/context>ai": ">=6"
```

`apps/web/package.json` then references `"ai": "catalog:"` etc.

### 1.3 Install commands

All installs need the Node 25 workaround first:

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"
```

```bash
# shadcn chat components — FIRST set "style": "base-nova" in BOTH
# packages/ui/components.json and apps/web/components.json (currently
# "new-york", which resolves the WRONG Radix variants — verified by dry-run).
cd packages/ui
pnpm dlx shadcn@latest add message-scroller message bubble input-group spinner
#   → decline the button.tsx overwrite at the interactive prompt (repo button
#     is customized; MessageScrollerButton works fine with it). Skip
#     attachment/marker for now (no v1 use).

# CSS + streamdown deps
pnpm --filter @workspace/ui add shadcn streamdown @streamdown/code

# app-side AI deps (after catalog edit above, from repo root)
pnpm install
```

Vendor manually (do NOT run the ai-elements CLI — it targets app-local `@/`
aliases): fetch `https://elements.ai-sdk.dev/api/registry/message.json`, copy
only `MessageResponse` into `packages/ui/src/components/ai-response.tsx`
("use client"), rewrite `@/lib/utils` → `@workspace/tailwind-config/utils`,
register plugins as `const streamdownPlugins = { code };`. No package.json
export edits needed — the `"./components/*"` glob covers it.

### 1.4 Tailwind v4 CSS wiring (required, the #1 gotcha)

In `packages/ui/src/styles/globals.css`, after the existing
`@import "tw-animate-css";`:

```css
@import "shadcn/tailwind.css"; /* scroll-fade/scrollbar/shimmer utilities for base-nova chat components */
/* streamdown ships Tailwind classes that must be scanned by OUR build: */
@source "../../node_modules/streamdown/dist/*.js";
@source "../../node_modules/@streamdown/code/dist/*.js";
```

Without the `@source` lines Streamdown renders unstyled. Dark mode is free:
Streamdown + base-nova use the repo's shadcn oklch tokens and `.dark` variant;
`@streamdown/code` uses Shiki dual themes keyed off `.dark`.

### 1.5 json-render doc cards

- Catalog (isomorphic, no JSX): `apps/web/src/lib/ai/catalog.ts` — exactly two
  components, `DocCardScroller` (slot, "use one, ≤3 children") and `DocCard`
  (`title`, `description`, `section`, `href` with `^\/[a-z0-9/-]*$` regex).
- Registry ("use client"): `apps/web/src/lib/ai/registry.tsx` — `DocCard`
  renders `next/link` with a `startsWith("/")` guard; scroller is a flex strip
  in an `overflow-x-auto` container. Both stay in `apps/web` (app-specific),
  not `packages/ui`.
- Server: append `docsCatalog.prompt({ mode: "inline" })` + the "only hrefs
  from retrieved pages" rule to the system instructions; pipe the UI-message
  stream through `pipeJsonRender`. Client: `useJsonRenderMessage(message.parts)`
  → `{ text, spec, hasSpec }`, render `<Renderer spec registry />` (bare first;
  add `StateProvider initialState={{}}` + `VisibilityProvider` only if it
  throws).
- **Compile-time verification required**: json-render docs target AI SDK 5/6;
  verify `pipeJsonRender(result.toUIMessageStream(...))` typechecks under
  `ai@7` (v7 spells it `toUIMessageStream({ stream: result.stream })`). If
  incompatible, fall back — without changing the milestone — to typed
  `data-docCards` parts written via `createUIMessageStream` writer (same UX,
  fewer moving parts; the retrieved pages are known server-side anyway).

### 1.6 Chat UI composition

- New primitives in `packages/ui/src/components/`: `message-scroller.tsx`,
  `message.tsx`, `bubble.tsx`, `input-group.tsx`, `spinner.tsx` (CLI-added),
  `ai-response.tsx` (vendored MessageResponse).
- Feature components in `apps/web/src/components/` (kebab-case):
  `chat-panel.tsx` (client; `useChat` + `DefaultChatTransport({ api: "/api/chat" })`),
  `chat-message.tsx`, `chat-composer.tsx`.
- Transcript: `MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor"`
  with `scrollAnchor` on user turns; height-constrained parent (`h-full` /
  `min-h-0` chain). Assistant text parts → `<MessageResponse isAnimating={…}>`
  inside `Bubble`; tighten `allowedLinkPrefixes`/`allowedImagePrefixes` to
  same-origin + `/`.
- v7 client rules: `message.parts` not `.content`; own the input state;
  `sendMessage({ text })`; `status` ∈ submitted/streaming/ready/error.
- Placement: dedicated **`/chat` page** plus a navbar entry (simplest to ship
  and smoke-test; a header popover panel can reuse `chat-panel.tsx` later).

---

## 2. Retrieval: Sanity Context (chosen), Fuse tool fallback

**Chosen: Sanity Context** — the hosted read-only MCP server at
`api.sanity.io`. It is GA on all plans, matches the user's explicit request,
needs no new infra (agentic GROQ retrieval, not embed-chunk RAG), and the repo
already satisfies every prerequisite (Studio v6 ≥ 5.1.0, `SANITY_API_READ_TOKEN`
validated in `packages/env/src/server.ts`).

**Skip Sanity Context Insights** (telemetry) — it is the only thing that
peer-locks `ai@^6`; skipping it frees us to use AI SDK v7. Revisit later if
conversation analytics are wanted (would mean pinning the v6 line).

### Wiring plan

Studio (`apps/studio`):

1. `pnpm --filter studio add @sanity/context` (exactly 1.0.0's peers are all
   satisfied; the `ai` peer is silenced via §1.2).
2. `sanity.config.ts`: add `contextPlugin()` from `@sanity/context/studio`.
3. In Studio, create and **publish** (drafts don't work) a Sanity Context doc:
   name "Docs Assistant", slug `docs-assistant` (stable — it's the URL
   segment), `groqFilter: _type == "doc" && hidden != true` (the security
   boundary, enforced server-side; filter expression only), `instructions`
   covering: nested slug paths, body lives in Portable Text (`array_field_reader`
   / `pt::text(body)`), cite pages by slug so the UI links `/{slug}`, never
   guess.
4. `pnpm exec sanity schema deploy` from `apps/studio` (Context reads the
   deployed schema, not local files).
5. Smoke test (expect 4 tools; if `context/mcp` 404s try the older
   `agent-context` path):

```sh
curl -X POST "https://api.sanity.io/v2026-02-27/context/mcp/63qexksi/production/docs-assistant" \
  -H "Authorization: Bearer $SANITY_API_READ_TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Web (`apps/web/src/app/api/chat/route.ts`), v7 surface:

- Per-request `createMCPClient` from `@ai-sdk/mcp` with
  `transport: { type: "http", url: MCP_URL, headers: { Authorization: Bearer <SANITY_API_READ_TOKEN> } }`;
  build the URL from `env` project id/dataset. Server-side only — the browser
  never sees the MCP URL or token.
- `const tools = await mcp.tools()`; strip `initial_context` and instead fetch
  `${MCP_URL}/initial-context` once in a `"use cache"` helper appended to the
  instructions (saves a tool call per conversation).
- `streamText({ model: "anthropic/claude-sonnet-5", instructions, messages: await convertToModelMessages(messages), tools, stopWhen: isStepCount(8), onEnd: () => mcp.close() })`
  → `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`
  (merged through `pipeJsonRender` per §1.5). `export const maxDuration = 30`.
  Route handlers are dynamic by default — no `"use cache"` on POST. If
  `AI_GATEWAY_API_KEY` is unset, return 503 with a clear message (mirror the
  `SANITY_REVALIDATE_SECRET` fail-closed pattern).
- Build the route so the `tools` object is injectable — that makes the
  fallback a drop-in.

**Fallback (only if the Context endpoint proves broken at smoke-test time):**
extract the existing Fuse.js logic from `/api/docs/search`
(`querySearchDocs`, `packages/sanity/src/query.ts:155`) into a shared function
exposed as a `searchDocs` `tool({ inputSchema: z.object({ query }) })`
returning top-N `{ slug, title, snippet }`, plus a `read_doc` tool that returns
the existing `.md` markdown-negotiation output for one slug. Identical loop,
route, and UI — only `tools` changes.

**Dataset embeddings** (semantic `text::semanticSimilarity()`): deferred —
it is the one paid part (AI credits, per dataset) and needs a user decision
(§6). Everything above works without it; enabling later is
`pnpm sanity datasets embeddings enable production --projection='…'` +
`?embeddings=true` on the MCP URL + a line in the Context doc instructions.

---

## 3. Next.js bump plan: 16.2.9 → 16.3.1

**Correction to the handoff:** `next` is pinned exact in
`apps/web/package.json` (line 30), **not** in the pnpm catalog. There are no
catalog edits strictly required — `react`/`react-dom`/`react-is` carets
(`^19.2.4`) already resolve to 19.2.8 on reinstall. Optionally rewrite those
three catalog entries to `^19.2.8` for clarity. Leave `typescript: 5.9.2` and
`@sanity/client ^7.22.1` alone (client 8.x is a major; next-sanity 13.3.3
peers on ^7.26.2 which the caret satisfies).

Exact changes in `apps/web/package.json`:

```jsonc
"next": "16.3.1",        // was 16.2.9
"next-sanity": "13.3.3", // was 13.1.0 — 13.1.7 fixed <SanityLive/> writing
                         // dynamic-bailout markers into prerendered HTML,
                         // plausibly the actual root cause of our error
```

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"
pnpm --filter web add next@16.3.1 next-sanity@13.3.3
pnpm install
```

**Codemods: none.** 16.2→16.3 is additive. Do NOT run
`npx @next/codemod@latest upgrade` — it can rewrite `catalog:` specifiers to
literals in this monorepo.

### Blocking-route fix (`apps/web/src/app/layout.tsx`)

The layout already implements the correct three-layer pattern; the error fires
because the **production branch awaits `CachedDocsShell` outside any Suspense**
while `getDocsShellData`'s `"use cache"` entry may not be prerenderable
(`cacheLife: { default: sanity }` from `next-sanity/live/cache-life` can be in
the seconds range). Ordered approach — stop at the first step that goes green:

1. Bump `next-sanity` to 13.3.3 (the `<SanityLive>` SSR fix) and rebuild.
2. If still failing: give `getDocsShellData` an explicit
   `cacheLife("hours")` + `cacheTag("docs-shell")` inside the `"use cache"`
   body (Pattern A — the `/api/revalidate-sync-tags` webhook already exists
   for invalidation). **Do not restructure `packages/sanity/src/live.ts`** —
   fix at the layout level only.
3. If data must stay per-request: wrap the production `CachedDocsShell` branch
   in `<Suspense>` (Pattern B) — reuse the existing trick of the cached
   published shell as fallback, or a shell skeleton.

Debug with `pnpm --filter web exec next build --debug-prerender`. Never "fix"
by making the whole layout dynamic.

Post-bump expectations: `next dev` now writes `apps/web/AGENTS.md` (decide
commit vs gitignore — see §6); Turbopack build disk cache + dev memory
eviction are on by default; do not add a custom `htmlLimitedBots` (open PPR
regression #96594). `next.config.ts` needs no changes. Follow-ups for separate
PRs, not this pass: `partialPrefetching: true`, TS7, Rust React Compiler,
`@next/playwright` `instant()`.

---

## 4. Environment variables

New — the user must supply **one** AI key (open question §6; Gateway
recommended):

| Var | Purpose |
|---|---|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway (recommended; create in Vercel dashboard → AI Gateway → API keys). On Vercel deploys OIDC can stand in, but set it anyway for local dev. |
| `ANTHROPIC_API_KEY` | Only if the user prefers a direct Anthropic key (then add `@ai-sdk/anthropic@^4.0.38` and use `anthropic("claude-sonnet-5")`). |

Already present, reused: `SANITY_API_READ_TOKEN` (Sanity Context MCP auth),
`NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` (MCP URL).

Registration points for the chosen key (all four, or builds strip/reject it):

1. `turbo.json` `globalEnv` — append `"AI_GATEWAY_API_KEY"`.
2. `packages/env/src/server.ts` — `AI_GATEWAY_API_KEY: z.string().min(1).optional()`
   (**must be `.optional()`**: `next.config.ts` imports `@workspace/env/server`,
   so a required var breaks every keyless `next dev`/`build`; the chat route
   fails closed at request time instead). No `experimental__runtimeEnv` entry
   needed; `client.ts` unchanged.
3. `apps/web/.env.example` — append `AI_GATEWAY_API_KEY=` with a comment
   (canonical env source per CLAUDE.md); user sets it in `apps/web/.env.local`.
4. Deploy targets: Vercel project env + shelve.cloud (team `robotostudio`).

---

## 5. Milestones

One commit per milestone. Gate suite after each, from repo root, all green
before committing: `pnpm lint` · `pnpm format:check` · `pnpm check-types` ·
`pnpm --filter sanity-blocks test` · `pnpm build:studio` · `pnpm build:web`.
Run `/code-review` after each commit. Sequential (same-repo mutation); no
codex-rescue agents in workflows.

**M1 — Next.js 16.3.1 + blocking-route fix** (§3). `/` renders with the shell
streaming under Suspense; `next build` clean with no blocking-route error;
AGENTS.md decision applied.

**M2 — Retrieval + chat API** (§2, §4). Studio `contextPlugin`, published
`docs-assistant` Context doc, `sanity schema deploy`, curl smoke test green;
env plumbing (all four registration points); catalog additions +
`pnpm install`; `/api/chat` route streaming a grounded answer end-to-end
(verify with curl — no UI yet). Includes the §1.5 `pipeJsonRender`-under-ai@7
compile check; if it fails, land the data-parts fallback here.

**M3 — Chat UI** (§1). `style: "base-nova"` in both components.json files;
shadcn add (decline button overwrite); vendored `ai-response.tsx`; CSS wiring
(§1.4); `/chat` page with message-scroller transcript, bubbles, Streamdown
rendering, composer; dark mode correct in both themes.

**M4 — json-render doc cards** (§1.5). Catalog + registry + inline prompt +
`useJsonRenderMessage` rendering; multi-doc question produces ≤3 cards in a
horizontal-overflow scroller linking into the docs; hrefs verified against
retrieved slugs only.

**M5 — Smoke test + polish.** Dev-server run of real questions ("how do
migrations work?", "what's the retainer scope?"); verify streaming, cards,
citations-as-links, empty-result honesty, `stop()`, error states; final gate
suite. Fold trivial fixes in here; anything structural goes back to its
milestone.

This matches the handoff's definition of done: (1) = M1, (2) = M2–M4, (3) = M5.

---

## 6. Open questions (user must decide — everything else is decided above)

1. **Which AI key will you supply?** `AI_GATEWAY_API_KEY` (recommended — one
   key, usage tracking, no provider package) or `ANTHROPIC_API_KEY` (direct).
   M2 is blocked on having one in `apps/web/.env.local`.
2. **Enable paid dataset embeddings on `production`?** Improves conceptual
   queries via `text::semanticSimilarity()`, costs AI credits scaled to
   projected content, slows writes slightly, disabling later deletes vectors.
   Ship without it first; decide after M5 smoke tests show keyword-miss cases.
3. **`apps/web/AGENTS.md`: commit or gitignore?** Next 16.3's dev server will
   create/maintain it. (Default if no answer: gitignore, since the repo
   standardizes on CLAUDE.md.)
