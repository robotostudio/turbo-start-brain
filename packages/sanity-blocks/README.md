# @workspace/sanity-blocks

The page-builder block library. Every block ships its Sanity schema, its GROQ
projection, its React component, and its Markdown serializer from one directory,
so both `apps/studio` and `apps/web` stay in sync from a single source.

## Layout

One directory per block, named after the block. The library ships two:
`rich-text-block` and `faq-accordion`.

```txt
src/faq-accordion/
  faq-accordion.schema.ts   # defineType, registered in Studio via `blockSchemas`
  faq-accordion.groq.ts     # GROQ projection, imported by packages/sanity/src/query.ts
  index.tsx                 # React component rendered by the frontend page builder
  markdown.ts               # Markdown serializer for the `.md` surface
  json-ld.ts                # Optional schema.org output (FAQPage)
  thumbnail.png             # Insert-menu preview in the Studio
  faq-accordion.test.tsx    # Co-located tests
```

`src/internal/` holds shared primitives (rich text, buttons, images, Markdown
helpers) used across blocks. `src/sanity-blocks.ts` exposes the `blockSchemas`
array that Studio and the page-builder array definition both consume.

## Imports

```typescript
import { blockSchemas } from "@workspace/sanity-blocks";
import { faqAccordionGroqProjection } from "@workspace/sanity-blocks/faq-accordion/faq-accordion.groq";
import { FaqAccordion } from "@workspace/sanity-blocks/faq-accordion/index";
import { pageBuilderToMarkdown } from "@workspace/sanity-blocks/internal/page-builder-to-markdown";
```

## Tests

```sh
pnpm --filter @workspace/sanity-blocks test
```

Vitest stubs `@workspace/env/client`, `lucide-react`, and `next/link`, so the
suite runs without any environment variables.

## Adding a block

Follow the checklist in [CLAUDE.md](../../CLAUDE.md#page-builder-pattern) — it
covers all eight files that a new block touches, including the Markdown
serializer, without which the block renders blank in `.md` output.
