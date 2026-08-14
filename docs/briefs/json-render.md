# Brief: vercel-labs/json-render — streaming doc cards from a chat answer

Researched 2026-08-14. Sources: https://github.com/vercel-labs/json-render, https://json-render.dev/docs (quick-start, streaming, ai-sdk, specs pages), npm registry.

## What it is

Generative-UI framework from Vercel Labs: the LLM emits a constrained JSON spec (only components you declare in a **catalog**), streamed as JSONL JSON-Patch ops ("SpecStream"), and a **registry** maps spec component names to your real React components. Guardrailed (model can't invent components/props — props are Zod-validated), streamable, framework-agnostic core.

## Packages + versions (verified on npm 2026-08-14)

| Package | Version | Notes |
|---|---|---|
| `@json-render/core` | **0.19.0** | `defineCatalog`, `catalog.prompt()`, `pipeJsonRender`, `createSpecStreamCompiler`. Dep: `zod ^4.3.6` (matches our catalog `zod ^4.3.6` exactly) |
| `@json-render/react` | **0.19.0** | `defineRegistry`, `Renderer`, providers, `useUIStream`, `useJsonRenderMessage`. Peer: `react ^19.2.3` (repo catalog has `react ^19.2.4` — OK) |
| `ai` (AI SDK) | 7.0.65 | not yet in this repo |
| `@ai-sdk/react` | 4.0.68 | `useChat` |
| `@ai-sdk/anthropic` | 4.0.38 | or route via AI Gateway model strings (`'anthropic/claude-haiku-4.5'`) |

Other renderers exist (`@json-render/shadcn`, vue/svelte/solid, react-native, next, remotion, pdf, email, ink, r3f, devtools, state adapters). We only need core + react — `@json-render/shadcn` ships its own 36 styled components and would fight our `@workspace/ui` conventions; skip it.

### Install (this repo)

Add to `pnpm-workspace.yaml` catalog:

```yaml
catalog:
  "@json-render/core": ^0.19.0
  "@json-render/react": ^0.19.0
  ai: ^7.0.65
  "@ai-sdk/react": ^4.0.68
```

Then in `apps/web/package.json` deps: `"@json-render/core": "catalog:"`, `"@json-render/react": "catalog:"`, `"ai": "catalog:"`, `"@ai-sdk/react": "catalog:"`, and `pnpm install` from root. (Registry components import from `@workspace/ui` — keep catalog/registry in `apps/web/src/`, not `packages/ui`, since they're app-specific.)

## Core API surface

1. **Catalog** (shared server+client, plain `.ts`):

```ts
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string(), description: z.string().nullable() }),
      slots: ["default"],           // may contain children
      description: "Container card", // fed to the LLM prompt
    },
  },
  actions: { navigate: { params: z.object({ url: z.string() }), description: "…" } },
});
```

2. **Registry** (client, `.tsx`): `const { registry } = defineRegistry(catalog, { components: { Card: ({ props, children, emit }) => <div>…</div> } })`.

3. **Render**: `<Renderer spec={spec} registry={registry} loading={isStreaming} />`. Full quick-start wraps in `StateProvider` / `VisibilityProvider` / `ActionProvider` / `ValidationProvider`; for static output (our doc cards: no `$state` bindings, no actions) `Renderer` alone is the goal, but include `StateProvider initialState={{}}` + `VisibilityProvider` if hooks complain — cheap insurance.

4. **Prompting**: `catalog.prompt()` generates the system prompt (component list, props, output format). `catalog.prompt({ mode: "inline" })` allows the model to mix prose with UI (chat case). Accepts custom rules to steer component choice.

5. **Wire format (SpecStream)**: JSONL of RFC-6902 patches with RFC-6901 pointers, e.g. `{"op":"add","path":"/elements/card-1","value":{...}}`, progressively building the spec:

```json
{
  "root": "scroller-1",
  "elements": {
    "scroller-1": { "type": "DocCardScroller", "props": {}, "children": ["c1", "c2", "c3"] },
    "c1": { "type": "DocCard", "props": { "title": "…", "description": "…", "section": "…", "href": "/getting-started/setup" }, "children": [] }
  }
}
```

Low-level client compiler if needed: `createSpecStreamCompiler()` from `@json-render/core` — `compiler.push(chunk)` → `{ result, newPatches }`, `compiler.getResult()`.

## Two integration modes with the AI SDK

- **Standalone** (UI-only response): server = `streamText({ system: catalog.prompt(), … }).toTextStreamResponse()`; client = `useUIStream({ api, onComplete, onError })` → `{ spec, isStreaming, error, send, clear }`. `send()` aborts the previous request.
- **Inline** (chat: prose + embedded UI — **our case**): server pipes the UI-message stream through `pipeJsonRender` (from `@json-render/core`), which splits prose from JSONL patches; client uses `useChat` + `useJsonRenderMessage(message.parts)` → `{ spec, text, hasSpec }` per message.

## Our use case: ~3 doc cards in a horizontal scroller

Catalog with exactly two components; constrain the model hard so `href` is an internal docs path.

```ts
// apps/web/src/lib/ai/catalog.ts
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

export const docsCatalog = defineCatalog(schema, {
  components: {
    DocCardScroller: {
      props: z.object({}),
      slots: ["default"],
      description:
        "Horizontal scroller of DocCard children. Use exactly one, with up to 3 DocCard children, when the answer draws on multiple docs pages.",
    },
    DocCard: {
      props: z.object({
        title: z.string(),
        description: z.string(),
        section: z.string().describe("Docs section name, e.g. 'Getting started'"),
        href: z
          .string()
          .regex(/^\/[a-z0-9/-]*$/)
          .describe("Site-relative docs path, e.g. /getting-started/setup. Never an absolute URL."),
      }),
      description: "Link card to one docs page the answer cites.",
    },
  },
});
```

```tsx
// apps/web/src/lib/ai/registry.tsx  ("use client")
"use client";
import { defineRegistry } from "@json-render/react";
import Link from "next/link";
import { docsCatalog } from "./catalog";

export const { registry } = defineRegistry(docsCatalog, {
  components: {
    DocCardScroller: ({ children }) => (
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-3 py-2">{children}</div>
      </div>
    ),
    DocCard: ({ props }) => {
      const href = props.href.startsWith("/") ? props.href : `/${props.href}`; // defense-in-depth vs external URLs
      return (
        <Link
          href={href}
          className="grid w-64 shrink-0 gap-1 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
        >
          <span className="text-muted-foreground text-xs">{props.section}</span>
          <span className="font-medium text-sm">{props.title}</span>
          <span className="line-clamp-2 text-muted-foreground text-xs">{props.description}</span>
        </Link>
      );
    },
  },
});
```

Note: registry uses a `flex` row inside the scroller (siblings in a strip — the repo's "prefer grid" rule allows flex here); Tailwind v4 CSS-first needs nothing extra — classes just work since the file lives under `apps/web`. If a scroll-snap feel is wanted: add `snap-x snap-mandatory` on the scroll container and `snap-start` on cards.

```ts
// apps/web/src/app/api/chat/route.ts
import { createUIMessageStream, createUIMessageStreamResponse, streamText, convertToModelMessages } from "ai";
import { pipeJsonRender } from "@json-render/core";
import { docsCatalog } from "@/lib/ai/catalog";

export async function POST(req: Request) {
  const { messages } = await req.json();
  // 1) retrieve relevant docs (GROQ against Sanity / embeddings) → build context + the real hrefs
  // 2) inject retrieved pages (title, section, path, excerpt) into the system prompt so the
  //    model copies real hrefs instead of inventing them
  const result = streamText({
    model: "anthropic/claude-haiku-4.5", // AI Gateway id, or @ai-sdk/anthropic provider
    system:
      docsCatalog.prompt({ mode: "inline" }) +
      "\nWhen your answer draws on 2+ of the provided docs pages, append one DocCardScroller with up to 3 DocCards. Use only hrefs from the provided pages.",
    messages: convertToModelMessages(messages),
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(pipeJsonRender(result.toUIMessageStream()));
    },
  });
  return createUIMessageStreamResponse({ stream });
}
```

```tsx
// apps/web/src/components/chat.tsx ("use client")
"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Renderer, useJsonRenderMessage } from "@json-render/react";
import { useState } from "react";
import { registry } from "@/lib/ai/registry";

function ChatMessage({ message }: { message: { parts: any[] } }) {
  const { text, spec, hasSpec } = useJsonRenderMessage(message.parts);
  return (
    <div className="grid gap-2">
      {text && <p>{text}</p>}
      {hasSpec && spec && <Renderer spec={spec} registry={registry} />}
    </div>
  );
}

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  return (
    <div className="grid gap-4">
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={status !== "ready"}>Send</button>
      </form>
    </div>
  );
}
```

Cards render progressively as patches arrive (spec updates incrementally), so the scroller appears while the answer is still streaming.

## Gotchas / caveats

- **Pre-1.0 (0.19.0), fast-moving**: package created 2026-01-14, 29 releases by 2026-05-07, **no publish since 2026-05-07** (~3 months). 15.9k stars, Apache-2.0, active repo — but expect breaking changes between minors; pin with `^0.19.0` in catalog and treat upgrades deliberately.
- **AI SDK version skew**: json-render docs are written against the AI SDK 5/6 surface (`createUIMessageStream`, `toUIMessageStream`, message `parts`). `ai` is now **7.0.65**; the docs' `useChat({ api })` + `input/handleInputChange` client snippet is the *old* API — use `DefaultChatTransport` + `sendMessage` as in the sketch. Implementation agent must verify `pipeJsonRender` accepts `result.toUIMessageStream()` under `ai@7` at compile time; if `ai@7` breaks it, `ai@^6` is the documented-compatible fallback (check `npm view ai@6 version` at implementation time).
- **Zod v4 required** — matches this repo's catalog (`zod ^4.3.6`). Don't introduce a second zod major.
- **Model compliance is the failure mode**: the model must emit valid SpecStream JSONL. Catalog Zod-validates props, and unknown components are rejected, but garbled output ⇒ `hasSpec` false / partial spec. Keep the catalog tiny (2 components), give explicit rules in the system prompt, and always feed the real retrieved hrefs — otherwise the model will hallucinate paths. Add the regex constraint + client-side `startsWith("/")` guard as above.
- **Client-only rendering**: `Renderer`/hooks are client components. Keep `registry.tsx` behind `"use client"`; the catalog file is isomorphic (no JSX) and is imported by the server route too — don't merge the two files.
- **Providers**: quick-start wraps `StateProvider`/`VisibilityProvider`/`ActionProvider`/`ValidationProvider`. Our static cards need none of the dynamic features (`$state`, actions, visibility); try bare `<Renderer/>` first, add `StateProvider initialState={{}}` + `VisibilityProvider` if it throws.
- **Biome/Ultracite**: the sketches follow repo style (double quotes, kebab-case files); `any` in `ChatMessage` props will warn — type as `UIMessage["parts"]` from `ai` in real code.
- **Simpler alternative worth knowing**: since the ~3 source docs are known *server-side after retrieval* (not model-invented), you could skip json-render entirely and stream a typed data part (`writer.write({ type: "data-doc-cards", data: [...] })`) rendered by a normal React component — fewer deps, no model-format risk. json-render earns its keep if we want the model to *choose* layout/components or plan to grow the generative-UI surface.

## Links

- Repo: https://github.com/vercel-labs/json-render
- Docs: https://json-render.dev/docs — key pages: `/docs/quick-start`, `/docs/catalog`, `/docs/registry`, `/docs/specs`, `/docs/streaming`, `/docs/ai-sdk`
- npm: https://www.npmjs.com/package/@json-render/core , https://www.npmjs.com/package/@json-render/react
