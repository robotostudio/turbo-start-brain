# Brief: shadcn/ui Base UI chat components for a chat interface

Researched 2026-08-14. All versions verified on npm; registry behavior verified with real `shadcn` CLI dry-runs and a real install against a copy of this repo's `packages/ui` config.

## Versions (npm, 2026-08-14)

| Package | Latest | In repo |
|---|---|---|
| `shadcn` (CLI + `tailwind.css` export) | **4.18.0** | not a dep (dlx only) |
| `@shadcn/react` (headless primitives) | **0.3.0** | — (added by CLI) |
| `@base-ui/react` | **1.7.0** | `^1.3.0` in `packages/ui` |
| `ai-elements` (Vercel CLI) | 1.9.0 | — |
| `ai` / `@ai-sdk/react` | 7.0.65 / 4.0.68 | — |

## What shipped (shadcn June 2026 "Components for Chat Interfaces")

Five styled components + one headless package ([changelog](https://ui.shadcn.com/docs/changelog/2026-06-chat-components)):

- **`message-scroller`** — the chat transcript scroll container: anchored turns, follow-streaming at live edge, prepended-history position preservation, saved-thread restore, jump-to-message, scroll-to-bottom button, visibility tracking. Docs: <https://ui.shadcn.com/docs/components/base/message-scroller>
- **`message`** — row layout: `MessageGroup, Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter` (plain divs + cn, no primitives)
- **`bubble`** — message surface: `BubbleGroup, Bubble, BubbleContent, BubbleReactions` (+ `bubbleVariants` cva)
- **`attachment`** — files/images: `Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction, AttachmentTrigger, AttachmentGroup` (+ cva variants)
- **`marker`** — system notes / separators / status rows: `Marker, MarkerIcon, MarkerContent, markerVariants`
- **`@shadcn/react`** npm package — unstyled behavior layer. v0.3.0 exports exactly two subpaths: `./message-scroller` and `./questionnaire`. Peer deps: `react >= 19` only. The styled `message-scroller.tsx` is a thin skin over it.

Also relevant, already in the registry: `scroll-area`, `spinner`, `input-group` (repo already has a hand-rolled `scroll-area.tsx`).

**There is NO `prompt-input`/`conversation` item in the shadcn registry** (verified 404 against `r/styles/base-nova/*.json`; full index has 63 items, chat-relevant ones are only: attachment, bubble, input-group, marker, message, message-scroller, scroll-area, spinner). Prompt input = compose `input-group` + textarea + button yourself, or use AI Elements' `PromptInput` (see last section).

## Registry / style mechanics (how Base variants are served)

Since CLI v4 (Mar 2026) styles are named `{library}-{theme}`. Verified-live style slugs at `https://ui.shadcn.com/r/styles/<style>/<name>.json`:

- Base UI: `base-nova`, `base-vega`, `base-lyra`, `base-maia`, `base-mira`
- Radix: `radix-nova`, legacy `new-york-v4`
- React Aria: `aria-nova`

There is **no separate registry namespace** for Base variants — everything is plain `@shadcn` (implicit). The CLI picks the variant from the `style` field in `components.json`. Base UI has been the **default** for new inits since July 2026 ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)).

### Critical gotcha: this repo's components.json still says `"style": "new-york"`

Both configs (verified by reading them):

- `packages/ui/components.json` — `style: "new-york"`, `tailwind.css: "src/styles/globals.css"`, aliases `components/ui → @workspace/ui/components`, `utils → @workspace/tailwind-config/utils`, `hooks → @workspace/ui/hooks`, iconLibrary lucide.
- `apps/web/components.json` — same style, `tailwind.css: "../../packages/ui/src/styles/globals.css"`, `ui → @workspace/ui/components`, app-local `components/hooks/lib → @/…`.

**Verified by dry-run in `packages/ui` as-is:** `pnpm dlx shadcn@4.18.0 add message-scroller --dry-run` resolves the **Radix** variant and wants to add a `radix-ui` dependency. Wrong for this repo (it uses `@base-ui/react`).

**Fix (one-line edit in BOTH components.json files) before adding:**

```json
"style": "base-nova"
```

**Verified:** with `style: "base-nova"`, the same add resolves the Base variants and the only npm dep added is `@shadcn/react` (no radix-ui). Note the docs' "cannot be changed after initialization" caveat applies to already-installed components — existing repo components (button, dialog, accordion…) stay as they are; only future `add`s use the new style. This repo already hand-migrated to Base UI (`base-drawer.tsx` imports `@base-ui/react/drawer`), so `base-nova` matches reality.

## Install commands

Run **from `packages/ui/`** (its components.json + glob exports make files land correctly):

```bash
cd packages/ui
pnpm dlx shadcn@latest add message-scroller message bubble attachment marker
# optional prompt-composer building blocks:
pnpm dlx shadcn@latest add input-group spinner
```

Useful CLI v4 flags: `--dry-run`, `--diff`, `--view`, `--overwrite`.

**Verified result of a real install** (against a clone of packages/ui config with style=base-nova):

- Files land as `packages/ui/src/components/{message-scroller,message,bubble,attachment,marker}.tsx` — matching the existing `"./components/*": "./src/components/*.tsx"` glob export in `packages/ui/package.json`. Import as `@workspace/ui/components/message-scroller` etc. No index/barrel needed.
- Imports are auto-rewritten to repo aliases: `cn` from `@workspace/tailwind-config/utils`, `Button` from `@workspace/ui/components/button`, icons to `lucide-react` (`ArrowDownIcon`). Clean.
- Adds `@shadcn/react ^0.3.0` to `packages/ui` dependencies.
- **Button overwrite warning:** `message-scroller` has `registryDependencies: ["button"]` and the CLI wants to overwrite `src/components/button.tsx` with the base-nova button. The repo button is heavily customized (rounded-none, accent-green hover, scale press). **Decline the button overwrite at the interactive prompt** (do not pass `--overwrite`). MessageScrollerButton only renders `<Button variant="secondary" size="icon">`, so the existing button works fine.
- Gotcha seen in testing: without a pnpm lockfile context the CLI fell back to `npm install`, which chokes on `catalog:` deps. Inside the real repo (pnpm-lock.yaml at root) it uses pnpm — fine. If it ever picks npm, install `@shadcn/react` manually: `pnpm --filter @workspace/ui add @shadcn/react`.

## Tailwind v4 CSS integration — required manual step

The base-nova components use custom utilities: `scroll-fade-b`, `scroll-fade-x`, `scrollbar-thin`, `scrollbar-none`, `scrollbar-gutter-stable`, `scrollbar-thumb-transparent`, `scrollbar-track-transparent`, `shimmer`. These are **NOT injected into globals.css by the CLI** (verified: globals.css untouched after install). They ship in the `shadcn` npm package's CSS export (`shadcn/dist/tailwind.css`, exported as `shadcn/tailwind.css` — verified to contain `--scroll-fade-*` @property/mask machinery). The base-nova `style.json` confirms the canonical stylesheet is:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

So:

```bash
pnpm --filter @workspace/ui add shadcn   # runtime dep for the CSS only
```

and in `packages/ui/src/styles/globals.css` add after the existing `@import "tw-animate-css";` (line 2):

```css
@import "shadcn/tailwind.css";
```

Token compatibility: globals.css already defines the standard shadcn oklch tokens (`--background`, `--primary`, …) + `@theme inline`, so bubble/message colors (`bg-primary`, `bg-muted`, etc.) just work. `tw-animate-css` is already imported. Message-scroller relies on `content-visibility`/`contain-intrinsic-size` + the scroll-fade mask — no config needed beyond the import. Watch for interaction with the repo's existing `--overscroll-top` trick and the hand-rolled `scroll-area.tsx` (the registry `scroll-area` would be a separate, richer Base component; keeping the local one is fine).

## Minimal usage (streaming chat transcript)

`MessageScroller` must live in a **height-constrained parent** (`h-full`/flex `min-h-0` chain), and is a client component (`"use client"` in the file already).

```tsx
import {
  MessageScrollerProvider, MessageScroller, MessageScrollerViewport,
  MessageScrollerContent, MessageScrollerItem, MessageScrollerButton,
} from "@workspace/ui/components/message-scroller";
import { Message, MessageAvatar, MessageContent } from "@workspace/ui/components/message";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";

<MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor" scrollPreviousItemPeek={64}>
  <MessageScroller className="flex-1">
    <MessageScrollerViewport>
      <MessageScrollerContent>
        {messages.map((m) => (
          <MessageScrollerItem key={m.id} messageId={m.id} scrollAnchor={m.role === "user"}>
            <Message align={m.role === "user" ? "end" : "start"}>
              <MessageAvatar>…</MessageAvatar>
              <MessageContent>
                <Bubble variant={m.role === "user" ? "primary" : "secondary"}>
                  <BubbleContent>{m.text}</BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          </MessageScrollerItem>
        ))}
      </MessageScrollerContent>
    </MessageScrollerViewport>
    <MessageScrollerButton />  {/* scroll-to-bottom */}
  </MessageScroller>
</MessageScrollerProvider>
```

Key provider props: `autoScroll` (follow streamed output at live edge), `defaultScrollPosition: "start" | "end" | "last-anchor"`, `scrollPreviousItemPeek` (px of previous turn kept visible on anchor scroll). `scrollAnchor` on user turns gives the ChatGPT-style "user question pins to top" behavior. Programmatic control hooks (re-exported from the styled file / import from `@shadcn/react/message-scroller`): `useMessageScroller()` → `scrollToMessage/scrollToEnd/scrollToStart`; `useMessageScrollerVisibility()` → `currentAnchorId`, `visibleMessageIds`; `useMessageScrollerScrollable()` → edge state.

## Overlap with AI SDK Elements

Official position (June 2026 changelog): the shadcn chat components **complement, do not replace** AI Elements ([vercel/ai-elements](https://github.com/vercel/ai-elements), CLI `ai-elements` 1.9.0, docs <https://elements.ai-sdk.dev/>). Practical split for this repo (no AI SDK/Elements code exists yet — verified):

- **Superseded by shadcn:** AI Elements' `Conversation` (a `use-stick-to-bottom` wrapper) — `MessageScroller` is strictly more capable (anchored turns, history prepend, restore, jump-to-message) and is Base UI-native. Also prefer shadcn `message`/`bubble`/`attachment` over Elements' `Message`.
- **Still AI Elements' territory (no shadcn equivalent):** `PromptInput` (attachments, model picker, submit-state), `Reasoning`, `Tool`, `Sources`, `CodeBlock`, `Suggestions`, `Response` (streamdown markdown). Install selectively: `pnpm dlx ai-elements@latest add prompt-input reasoning tool response` — components land per the same components.json.
- **Caveat:** AI Elements items are authored against Radix-flavored shadcn components; with `style: base-nova` its registryDependencies will resolve to Base variants of shared parts (button, etc.) which is what we want, but review each added Elements file for stray `radix-ui` imports before committing. Elements pieces are just files — they can be moved into `packages/ui/src/components/` and re-pointed at `@workspace/*` aliases like everything else.

## Links

- Message Scroller (Base): https://ui.shadcn.com/docs/components/base/message-scroller
- Message / Bubble / Attachment / Marker (Base): https://ui.shadcn.com/docs/components/base/{message,bubble,attachment,marker}
- Chat components changelog: https://ui.shadcn.com/docs/changelog/2026-06-chat-components
- Base UI default announcement: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- CLI v4: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- Registry item inspection (used for verification): `https://ui.shadcn.com/r/styles/base-nova/message-scroller.json`
- AI Elements: https://github.com/vercel/ai-elements · https://elements.ai-sdk.dev/
