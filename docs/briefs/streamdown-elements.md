# Streamdown + AI SDK Elements — research brief

Date: 2026-08-14. Versions verified on npm today. For the implementation agent building a streaming-markdown chat pane in this repo (Next.js 16 / React 19 / Tailwind v4 CSS-first / Base UI-flavored shadcn in `packages/ui`).

## 1. Exact packages + versions (npm, 2026-08-14)

| Package | Version | Role |
|---|---|---|
| `streamdown` | **2.5.0** | Core streaming-markdown renderer (`<Streamdown>`). Peer: react 18/19. |
| `@streamdown/code` | **1.1.1** | Optional plugin: Shiki highlighting, copy/download buttons, line numbers |
| `@streamdown/math` | **1.0.2** | Optional plugin: KaTeX math |
| `@streamdown/mermaid` | **1.0.2** | Optional plugin: Mermaid diagrams + fullscreen viewer |
| `@streamdown/cjk` | **1.0.3** | Optional plugin: CJK punctuation handling |
| `ai` | **7.0.65** | AI SDK core (`UIMessage` type) |
| `@ai-sdk/react` | **4.0.68** | `useChat` |
| `use-stick-to-bottom` | **1.1.6** | Scroll anchoring used by Elements `Conversation` |
| `shiki` | **4.4.3** | Only needed directly if using Elements standalone `code-block`; `@streamdown/code` bundles its own |
| `ai-elements` (CLI) | **1.9.0** | Installer CLI, run via `npx`/`pnpm dlx` — never a runtime dep |
| `shadcn` (CLI) | **4.18.0** | Alternative installer via registry namespace |

Streamdown 2.x is a rewrite of the v1 monolith into a **tree-shakeable plugin architecture**: core is markdown-only (marked + remark-gfm + rehype-harden/sanitize, `remend` for incomplete-markdown repair); Shiki/KaTeX/Mermaid moved into the `@streamdown/*` plugin packages so you only pay for what you register. Original announcement (v1, Aug 2025): https://vercel.com/changelog/introducing-streamdown. Docs: https://streamdown.ai/docs.

Note: `streamdown@2.5.0` still lists `mermaid` in its own `dependencies` — it will land in the lockfile regardless, but is not bundled into the client unless the mermaid plugin is used.

## 2. How Elements relates to Streamdown

- **AI SDK Elements** (https://elements.ai-sdk.dev) is a **shadcn-style custom registry** (copy-paste source, not an npm runtime library) built on shadcn/ui, from the AI SDK team. Registry index: `https://elements.ai-sdk.dev/api/registry/registry.json`.
- The old standalone **`Response` component is gone** — there is **no `response` item in the registry anymore**. Markdown rendering now lives inside the `message` item as **`<MessageResponse>`**, which is a thin memoized wrapper around `<Streamdown>`:

```tsx
// from registry/default/ai-elements/message.tsx (current, v1.9.0)
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";

const streamdownPlugins = { cjk, code, math, mermaid };

export const MessageResponse = memo(
  ({ className, ...props }: ComponentProps<typeof Streamdown>) => (
    <Streamdown
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prev, next) => prev.children === next.children && next.isAnimating === prev.isAnimating
);
```

- Current message-pane component set (all current, none deprecated):
  - **`message`** → `Message` (role wrapper, `from: UIMessage["role"]`, sets `.is-user`/`.is-assistant` group classes), `MessageContent` (bubble styling), `MessageResponse` (Streamdown), `MessageActions`/`MessageAction` (tooltip'd icon buttons), `MessageToolbar`, and branching: `MessageBranch`, `MessageBranchContent`, `MessageBranchSelector`, `MessageBranchPrevious/Next/Page`.
  - **`conversation`** → `Conversation` (wraps `StickToBottom` from `use-stick-to-bottom`, auto-scrolls during streaming), `ConversationContent`, `ConversationEmptyState`, `ConversationScrollButton` (appears when scrolled up), `ConversationDownload` (+ `messagesToMarkdown()` util).
  - **`prompt-input`** → composer (textarea, model select, submit); heavy regdeps (command, dropdown-menu, hover-card, input-group, select, spinner, tooltip).
  - Other registry items (all optional): `reasoning`, `tool`, `sources`, `code-block`, `chain-of-thought`, `suggestion`, `shimmer`, `artifact`, `attachments`, `task`, `terminal`, `web-preview`, `inline-citation`, `context`, `model-selector`, `agent`, `canvas`, `plan`, `queue`, etc.
- Registry item dependencies (fetched from the registry JSON today):
  - `message`: npm deps `streamdown`, all four `@streamdown/*` plugins, `ai`, `lucide-react`; registry deps `button`, `button-group`, `tooltip`.
  - `conversation`: npm deps `ai`, `lucide-react`, `use-stick-to-bottom`; registry deps `button`.
  - `code-block` (standalone, for non-chat code display): `shiki`, `lucide-react`; registry deps `button`, `select`.

## 3. How the latest Vercel chat UIs are built (vercel/ai-chatbot, checked today)

`vercel/ai-chatbot` (next 16.2.10, react 19.2.7, ai 7.0.15, @ai-sdk/react 4.0.16) **vendors the Elements source** into `components/ai-elements/` (code-block, conversation, message, model-selector, prompt-input, reasoning, shimmer, suggestion, tool) and composes app-level chat components in `components/chat/` on top. Deps: `streamdown ^2.3.0` + all four `@streamdown/*` plugins + `use-stick-to-bottom ^1.1.6`. Its `app/globals.css` line 4:

```css
@source "../node_modules/streamdown/dist/index.js";
```

Pattern to copy: **vendor the Elements files you need, don't depend on the CLI at runtime**; render with `useChat` from `@ai-sdk/react`, mapping `message.parts` (AI SDK v7 `UIMessage` has `parts`, **not** `content`) — text parts go through `MessageResponse`.

## 4. Installation options for this repo

**Option A (recommended for this monorepo): manual vendoring.** The CLIs (`npx ai-elements@latest add message` / `pnpm dlx shadcn@latest add @ai-elements/message`) write to `@/components/ai-elements/` in the app and assume app-local `@/components/ui/*` + `@/lib/utils`. In this repo components live in `packages/ui` with `@workspace/*` aliases, so vendor manually: fetch source from `https://elements.ai-sdk.dev/api/registry/message.json` and `.../conversation.json` (each item's `files[0].content` is the full TSX), place in `packages/ui/src/components/`, and rewrite imports:
- `@/registry/default/ui/button` → `@workspace/ui/components/button`
- `@/lib/utils` → `@workspace/tailwind-config/utils` (the repo's `cn`)

**Option B: shadcn CLI from `apps/web`** (`cd apps/web && pnpm dlx shadcn@latest add @ai-elements/message`) — components.json exists there, but it will drop files under `apps/web` and pull regdeps into the wrong place; only use for scaffolding, then move.

**Base UI compatibility:** as of shadcn/ui **July 2026, Base UI is the default primitive library** (changelog: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default); the `style` field in components.json now selects library+style combos (`base-*` vs `radix-*`), and registry items without a pinned `registry:base` initialize as Base UI. The Elements component **source itself uses no Radix primitives directly** — only shadcn `Button`/`Tooltip`/`ButtonGroup` via registry deps — so it is primitive-agnostic and works fine on a Base UI-flavored setup. Caveats:
- Both components.json files in this repo still say `"style": "new-york"` (legacy → resolves Radix-flavored regdeps). If using the CLI, expect Radix-flavored `tooltip`/`button-group` to be pulled; when vendoring manually, substitute Base UI equivalents or strip them (see §7).
- `packages/ui` currently has no `tooltip` or `button-group` component. `MessageAction` needs Tooltip; `MessageBranchSelector` needs ButtonGroup. Both are trivially removable if you don't need actions/branching.

**Install (Option A), from repo root:**

```bash
pnpm --filter @workspace/ui add streamdown @streamdown/code
pnpm --filter web add ai @ai-sdk/react
pnpm --filter @workspace/ui add use-stick-to-bottom   # only if vendoring Conversation
```

Consider adding `ai`, `@ai-sdk/react`, `streamdown` to the `catalog:` in `pnpm-workspace.yaml` per repo convention. Skip `@streamdown/math`, `@streamdown/mermaid`, `@streamdown/cjk` unless docs-chat answers need LaTeX/diagrams — each adds bundle weight (mermaid is large).

## 5. Tailwind v4 config (required, repo-specific)

Streamdown's dist ships Tailwind utility classes that must be scanned by the **consumer's** build. Add `@source` lines to `packages/ui/src/styles/globals.css` (the single Tailwind entry for the whole repo). Paths are relative to that CSS file; `packages/ui/node_modules/` exists (pnpm symlinks — the file already uses `@plugin "../../node_modules/@tailwindcss/typography"` for exactly the Turbopack-can't-resolve-bare-specifiers reason, so follow the same relative-path style):

```css
/* streaming markdown (streamdown) — must be scanned or output is unstyled */
@source "../../node_modules/streamdown/dist/*.js";
@source "../../node_modules/@streamdown/code/dist/*.js";
/* add matching lines ONLY for plugins actually installed:
@source "../../node_modules/@streamdown/math/dist/*.js";
@source "../../node_modules/@streamdown/mermaid/dist/*.js";
*/
```

Without these, Streamdown renders semantic HTML with no styling. This is the #1 integration gotcha.

## 6. Dark mode

- Streamdown styles via Tailwind `dark:` variants compiled **in your build** (that's what `@source` achieves), so it automatically follows the repo's `@custom-variant dark (&:is(.dark *))` + next-themes class switching. No extra config.
- Streamdown uses shadcn tokens (`text-foreground`, `bg-secondary`, `border`, `muted` etc.), so it inherits the repo's oklch palette in both modes.
- Code highlighting: `@streamdown/code` uses Shiki **dual themes** (defaults `github-light`/`github-dark`, switching with the `.dark` class). Customize via `createCodePlugin({ themes: ["github-light", "github-dark"] })` instead of the bare `code` export.
- Elements `MessageContent` puts `is-user:dark` on user bubbles (user bubble intentionally renders in inverted scheme) — harmless, but know it's there if user-bubble colors look inverted.

## 7. Recommended minimal set for this repo (streaming markdown chat pane)

Goal: assistant responses streaming as markdown inside a chat pane, using the repo's existing Base-UI-flavored `packages/ui` and its `scroll-area`/message-scroller.

1. **Runtime deps:** `streamdown` + `@streamdown/code` (skip math/mermaid/cjk initially), `ai`, `@ai-sdk/react`, `use-stick-to-bottom`.
2. **Vendor into `packages/ui/src/components/` (kebab-case per repo convention):**
   - `ai-message.tsx` — `Message`, `MessageContent`, `MessageResponse` from the registry `message` item, **stripped**: drop `MessageActions/Action` (needs Tooltip), `MessageBranch*` (needs ButtonGroup), and `MessageToolbar` unless needed. That removes both missing regdeps; what remains depends only on `cn`, `streamdown`, plugins, and `UIMessage` from `ai`. Register only installed plugins: `const streamdownPlugins = { code };`
   - `ai-conversation.tsx` — `Conversation`, `ConversationContent`, `ConversationScrollButton` from the `conversation` item (uses existing `@workspace/ui/components/button`). Prefer this over hand-rolling on `scroll-area`: `use-stick-to-bottom` gives resize-aware pinned-to-bottom streaming scroll, which ScrollArea alone does not.
3. **Tailwind:** the two `@source` lines from §5.
4. **Export map:** components are auto-exposed by the existing `"./components/*"` export in `packages/ui/package.json` — no package.json change needed.

Minimal usage in `apps/web` (client component):

```tsx
"use client";
import { useChat } from "@ai-sdk/react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@workspace/ui/components/ai-conversation";
import { Message, MessageContent, MessageResponse } from "@workspace/ui/components/ai-message";

export function ChatPane() {
  const { messages, status, sendMessage } = useChat();
  return (
    <Conversation className="relative h-full">
      <ConversationContent>
        {messages.map((message) => (
          <Message from={message.role} key={message.id}>
            <MessageContent>
              {message.parts.map((part, i) =>
                part.type === "text" ? (
                  <MessageResponse
                    isAnimating={status === "streaming" && message.id === messages.at(-1)?.id}
                    key={`${message.id}-${i}`}
                  >
                    {part.text}
                  </MessageResponse>
                ) : null
              )}
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
```

Key `<Streamdown>`/`MessageResponse` props: `parseIncompleteMarkdown` (default true — repairs unterminated bold/links/code fences mid-stream), `isAnimating` (caret + memo invalidation), `allowedImagePrefixes` / `allowedLinkPrefixes` (default `["*"]`; **tighten these** — security hardening blocks unexpected origins and shows link-confirmation modals), `defaultOrigin`, `remarkPlugins`/`rehypePlugins`.

## 8. Gotchas checklist

- `@source` lines missing → unstyled markdown (most common failure).
- AI SDK v7: `UIMessage.parts`, not `.content`; `useChat` returns `sendMessage` (v7 API), `status` is `"submitted" | "streaming" | "ready" | "error"`.
- `MessageResponse` memo compares `children` + `isAnimating` only — pass a stable string child, not JSX.
- Biome/Ultracite will reformat vendored files (double quotes, 2-space — registry source already matches).
- `pnpm-workspace.yaml` `overrides` pins `dompurify` ≥3.4 etc. — no known conflicts with streamdown's tree (marked/unified-based, no dompurify).
- If Elements CLI is ever run, it targets Node 18+/Tailwind 4/React 19 — all satisfied here.
- Chat API route: standard `ai` v7 route handler (`streamText(...).toUIMessageStreamResponse()`) — out of scope here but required for `useChat`.

## Links

- https://streamdown.ai / https://streamdown.ai/docs/getting-started / https://streamdown.ai/docs/plugins/code
- https://vercel.com/changelog/introducing-streamdown
- https://elements.ai-sdk.dev/docs/setup / https://elements.ai-sdk.dev/components/message / https://elements.ai-sdk.dev/components/conversation
- Registry JSON: https://elements.ai-sdk.dev/api/registry/registry.json (per-item: `/api/registry/<name>.json`)
- https://github.com/vercel/ai-elements · https://github.com/vercel/ai-chatbot (see `components/ai-elements/`)
- shadcn Base UI default: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
