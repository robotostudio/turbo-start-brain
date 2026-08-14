# Turbo Start Brain — conversion brief

Goal: convert this copy of the `turbo-start-sanity` marketing starter into a plug-and-play company knowledgebase ("Turbo Start Brain"): hierarchical docs (e.g. `/getting-started/tool-onboarding`), Mux video via `sanity-plugin-mux-input`, fumadocs-style docs UI. Strip ALL landing-page/blog opinionation. Keep the template's engineering patterns (typegen, live/visual editing, block conventions, biome) intact.

Sanity project: `63qexksi`, dataset `production`. Env is already wired in `.env.local` files (do not touch tokens).

Repo root: `/Users/jono/dev/turbo-start-brain`. No Mux anywhere yet.

## 1. Monorepo wiring

**Workspaces** — `pnpm-workspace.yaml`: `apps/*`, `packages/*`. Catalog pins: `sanity ^6.1.0`, `@sanity/client ^7.22.1`, `react/react-dom ^19.2.4`, `tailwindcss ^4.2.1`, `typescript 5.9.2`, `zod ^4.3.6`, `vitest ^3.2.4`, `lucide-react`, `next-themes`, `tw-animate-css`. `peerDependencyRules.allowedVersions` already whitelists `sanity-plugin-*>sanity: ">=5"` — add `sanity-plugin-mux-input>sanity: ">=5"` (and likely `>@sanity/ui: ">=3"`) there, otherwise pnpm peer resolution complains against Sanity 6.

**Turbo** — `turbo.json`. Tasks: `build` (dependsOn `^build`, outputs `.next/**`, `dist/**`, `.sanity/**`), `transit` (no-op fan-out that `lint`/`format`/`format:check`/`check-types`/`test` depend on), `type` (uncached — `sanity typegen generate`), `dev` (persistent), `test:e2e`. `globalEnv` is the authoritative env allowlist; any new var must be added there or Turbo will hash-ignore it.

**Env handling**
- Validated env in `packages/env/src/client.ts` and `packages/env/src/server.ts` (`@t3-oss/env-nextjs` + zod, exported as `@workspace/env/client|server`). Client requires `NEXT_PUBLIC_SANITY_PROJECT_ID|DATASET|API_VERSION|STUDIO_URL`; server requires `SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN`, optional `SANITY_REVALIDATE_SECRET`. Imported for side effects at top of `apps/web/next.config.ts`.
- Shelve wired: `/shelve.json` (org `robotostudio`), `apps/web/shelve.json` (project `turbo-start-sanity-web`), `apps/studio/shelve.json` — rename projects to `turbo-start-brain-*`.
- `.env.example` in `apps/web`, `apps/studio`, plus `packages/sanity/` and `packages/sanity-blocks/` (needed because vitest/typegen resolve `@workspace/env` at module load). `.env.local` files exist with real values — leave values alone.

**projectId/dataset resolution**
- Studio: `SANITY_STUDIO_PROJECT_ID`/`SANITY_STUDIO_DATASET` in `apps/studio/sanity.config.ts`, `sanity.cli.ts`, `sanity.blueprint.ts`.
- Web: `env.NEXT_PUBLIC_SANITY_*` in `packages/sanity/src/client.ts`, `apps/web/src/components/pagebuilder.tsx` (`createDataAttribute`), `apps/web/next.config.ts` (`images.remotePatterns`). Add `image.mux.com` to `remotePatterns` when Mux lands.

## 2. apps/studio

- Config: `apps/studio/sanity.config.ts`. Plugins: `presentationTool({resolve: {locations}, previewUrl: {origin: getPresentationUrl(), previewMode: {enable: "/api/presentation-draft"}}})`, `structureTool({structure})`, `presentationUrl()` (local plugin), `visionTool()`, `lucideIconPicker()`, `unsplashImageAsset()`, `media()`, `assist()`. Also `releases: {enabled: true}`, `newDocumentOptions` filter via `hiddenTemplateIds` (`singletonTypes` + assist/media tags), and one schema template `nested-page-template` (schemaType `page`, param `slug`) used by the folder structure's "Add page" item. **Mux plugin goes in this plugins array** (`muxInput()`).
- CLI: `apps/studio/sanity.cli.ts` — `schemaExtraction`, `deployment.appId` from `SANITY_STUDIO_APP_ID`, typegen block: reads `schema.json`, scans `../../packages/sanity/src/**/*`, writes `../../packages/sanity/src/sanity.types.ts`, `overloadClientMethods: true`. Vite alias `@` → studio root (also in `vite.config.ts`).
- Schema registration (three files):
  - `apps/studio/schemaTypes/index.ts`: `schemaTypes = [...documents, ...definitions, ...blockSchemas]`; `singletonTypes = singletons.map(...)`.
  - `apps/studio/schemaTypes/documents/index.ts`: `singletons = [homePage, blogIndex, settings, footer, navbar]`; `documents = [blog, page, faq, author, ...singletons, redirect]`.
  - `apps/studio/schemaTypes/definitions/index.ts`: `definitions = [customUrl, richText, button, pageBuilder]`.
  - Block schemas from `@workspace/sanity-blocks` (`packages/sanity-blocks/src/sanity-blocks.ts` → `blockSchemas`).
- Structure: `apps/studio/structure.ts` — `homePage` singleton, `createSlugBasedStructure(S, "page")`, blogIndex + orderable blog list (`@sanity/orderable-document-list`), `faq`, `author`, `redirect`, "Site Configuration" (navbar/footer/settings).
- **Key asset**: `apps/studio/components/nested-pages-structure.ts` — builds a folder tree from `slug.current` split on `/`, dedupes drafts, folder counts, "Add page" intent prefilled with a `friendlier-words` slug, flat-list fallback. This is the docs-tree pane; retarget `schemaType` from `"page"` to `"doc"`.
- Slug helpers: `apps/studio/schemaTypes/common.ts` (`documentSlugField(documentType, opts)` + custom `PathnameFieldComponent`), `apps/studio/utils/slug-validation.ts` (per-type `CONFIGS`: blog prefix rules, homePage `/`, page free-form; `createSlugErrorValidator`/`createSlugUniqueValidator`/`createSlugWarningValidator`/`generateSlugFromTitle`), `apps/studio/components/slug-field-component.tsx`, `components/url-slug/validation-messages.tsx`.
- Presentation locations: `apps/studio/location.ts` — `blog`, `home`, `page` resolvers.
- Misc: `apps/studio/plugins/presentation-url.ts`, `utils/constant.ts` (`GROUP`/`GROUPS`, `API_VERSION`), `utils/seo-fields.ts`, `utils/og-fields.ts`, `utils/helper.ts` (`getTitleCase`, `getPresentationUrl`, `parseRichTextToString`, `createRadioListLayout`), `components/logo.tsx`, `components/icon-preview.tsx`.
- Serverless: `apps/studio/sanity.blueprint.ts` registers `functions/auto-redirect` (creates `redirect` docs on slug change) and `functions/invalidate-tags` (posts syncTags to `/api/revalidate-sync-tags`).

## 3. apps/web route table

| Route (under `apps/web/src/`) | Purpose | Verdict |
|---|---|---|
| `app/layout.tsx` | fonts, Providers, Navbar/Footer (draft-aware), `SanityLive`, `VisualEditing`, PreviewBar, JSON-LD | modify: docs shell (top bar + sidebar + TOC rail), drop StickyFooter/GitHub stars |
| `app/page.tsx` | `homePage` singleton → PageBuilder | modify: docs landing (docsIndex or redirect to first doc) |
| `app/[...slug]/page.tsx` | catch-all `page`, `generateStaticParams` via `querySlugPagePaths`, breadcrumbs, PageBuilder | keep as docs route model — retarget to `doc` |
| `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` | blog | harvest RichText+TOC layout from `[slug]`, then delete both |
| `app/api/blog/search/route.ts` | Fuse.js search | delete or repurpose as docs search |
| `app/api/markdown/route.ts` | `.md` twin renderer | keep, strip blog branches |
| `app/api/presentation-draft/route.ts`, `app/api/disable-draft/route.ts`, `app/api/revalidate-sync-tags/route.ts`, `app/actions/revalidate.ts`, `app/actions.ts` | draft mode + live revalidation | keep untouched |
| `app/sitemap.ts` | `querySitemapData` `{slugPages, blogPages}`, hardcodes `/blog` | modify — breaks on blog deletion |
| `app/robots.ts`, `app/not-found.tsx` | trivial | keep |
| `app/llms.txt/route.ts` | index of `.md` twins; imports blog search query | modify (drop blog) |
| `src/proxy.ts` | `.md` suffix + Accept header → `/api/markdown`; forwards `page`/`category` params | keep, drop `category`/`page` forwarding |

**Sanity infra to keep untouched**: `packages/sanity/src/client.ts`, `packages/sanity/src/live.ts` (`defineLive`, `sanityFetch` + sync tags, `sanityFetchStaticParams`, `sanityFetchMetadata`), `apps/web/src/components/preview-bar.tsx`, `apps/web/src/lib/seo.ts`.

**GROQ + typegen**: all queries in `packages/sanity/src/query.ts` (`defineQuery`); block projections imported from `@workspace/sanity-blocks/<block>/<block>.groq` and concatenated into `pageBuilderFragment`. Generated types `packages/sanity/src/sanity.types.ts` → `@workspace/sanity/types`, consumed via `Get`/`FilterByType` helpers in `apps/web/src/types.ts`. Pipeline: `pnpm --filter studio extract` then `pnpm --filter studio type` (root alias `pnpm type`). `schema.json` is biome-ignored.

**PortableText**: renderer map in `packages/sanity-blocks/src/internal/rich-text.tsx` (`block.h1–h6` with heading-slug ids, `marks.code|customLink`, `types.image|code`). **This is where a mux video PT type registers.** Schema side: `packages/sanity-blocks/src/internal/sanity-rich-text.ts` — `PORTABLE_TEXT_MEMBER_NAMES = {block, image, code}`, `richTextMembers`, `definePortableTextField`, `portableTextMemberTypes`. Adding a member requires editing BOTH. `apps/studio/schemaTypes/definitions/rich-text.ts` re-exports as `richText`.

**Web components** (`apps/web/src/components/`): blog cruft = `blog-list|blog-pagination|blog-search-layout|blog-page-content|blog-card|blog-category-filter|blog-search|blog-search-results`.tsx, `hooks/use-blog-search.ts`, `lib/blog-index.ts`, `lib/blog-categories.ts`. Marketing cruft = `github-stars.tsx` + `lib/github-stars.ts`, `sticky-footer.tsx`, `footer.tsx`, `footer-theme-toggle.tsx`. Keep/harvest = `elements/table-of-content.tsx` (desktop+mobile TOC from PortableText headings → docs TOC), `breadcrumbs.tsx` (`ancestorCrumbs(slug)` walks path segments), `pagebuilder.tsx`, `json-ld.tsx`, `page-builder-json-ld.tsx`, `copy-markdown-button.tsx`, `scroll-to-top.tsx`, `providers.tsx`, `preview-bar.tsx`, `navbar.tsx`/`mobile-menu.tsx`/`elements/menu-link.tsx` (rewrite as docs top bar).

## 4. packages/sanity & packages/sanity-blocks

`@workspace/sanity`: 4 files — `client.ts`, `live.ts`, `query.ts`, `sanity.types.ts`. Keep all; `query.ts` heavily rewritten.

`@workspace/sanity-blocks`: 9 blocks, each folder = `<name>.schema.ts`, `<name>.groq.ts`, `index.tsx`, `markdown.ts`, `thumbnail.png`, tests: `hero` (incl. `hero-video.tsx`), `cta`, `feature-cards-icon`, `faq-accordion` (+`json-ld.ts`), `logo-cloud`, `social-grid`, `showcase-grid`, `rich-text-block`, `subscribe-newsletter`. Shared internals under `src/internal/` (each mapped in `package.json` exports): `rich-text.tsx`, `sanity-rich-text.ts`, `sanity-image.tsx`, `code-block.tsx`, `copy-button.tsx`, `heading-slug.ts`, `icons.tsx`, `block-header.tsx`, `block-eyebrow.tsx`, `sanity-buttons.tsx`, `sanity-icon.tsx`, `schema-fields.ts`, `safe-href.ts`, `groq-fragments.ts`, `markdown.ts`, `portable-text-to-markdown.ts`, `page-builder-to-markdown.ts`, `rendering.tsx`, `use-copy.ts`, `use-disclosure-animation.ts`, `blog-categories.ts`, `logo-height.ts`, testing mocks.

**Page-builder mechanics — 3 coupled lists, keep in sync:**
1. `blockSchemas` in `packages/sanity-blocks/src/sanity-blocks.ts` → consumed by `apps/studio/schemaTypes/definitions/pagebuilder.ts` (maps names into `pageBuilder` array + insert-menu thumbnail `/static/thumbnails/preview-<kebab>.png`).
2. `pageBuilderFragment` in `packages/sanity/src/query.ts`.
3. `renderBlockComponent` switch in `apps/web/src/components/pagebuilder.tsx`.
Thumbnails synced into `apps/studio/static/thumbnails/` by `packages/sanity-blocks/scripts/sync-thumbnails.ts` (studio `postinstall` and `pnpm sync-thumbnails`).

Keep for docs: `rich-text-block`, `faq-accordion`, `feature-cards-icon` (repurpose as fumadocs-style "cards"), all `internal/*` except `blog-categories.ts`. Delete: `hero`, `cta`, `logo-cloud`, `social-grid`, `showcase-grid`, `subscribe-newsletter`.

## 5. packages/ui

`packages/ui/src/components/`: only `accordion.tsx`, `base-drawer.tsx`, `button.tsx`, `input.tsx`, `navigation-menu.tsx`; hook `use-media-query.ts`. No sidebar/TOC/tabs/callout/search/breadcrumb primitives — build them. Deps: `@base-ui/react ^1.3.0` (NOT Radix except react-slot), `class-variance-authority`, `@tailwindcss/typography`. `exports` is glob-based (`./components/*`, `./hooks/*`) — new files need no manifest edit. shadcn `components.json` in `packages/ui` and `apps/web`.

Tailwind v4, CSS-first: `packages/ui/src/styles/globals.css` is the single stylesheet (imported by web `layout.tsx`); declares `@source` globs for `apps/**` and `packages/sanity-blocks/src/**`, and `@plugin` for typography by relative node_modules path (Turbopack constraint — do NOT "fix" to a bare specifier). Sidebar tokens (`--sidebar`, etc.) already exist in `:root`. PostCSS at `packages/tailwind-config/postcss.config.mjs`; `cn()` at `packages/tailwind-config/src/utils.ts`.

## 6. Breakage map when deleting document types

- `apps/studio/structure.ts` — direct `type:` refs to homePage/page/blogIndex/blog/faq/author/redirect/navbar/footer/settings.
- `apps/studio/location.ts` — keys must match doc type names.
- `apps/studio/utils/slug-validation.ts` — `CONFIGS` keyed by blog/blogIndex/homePage/page.
- `apps/studio/sanity.config.ts` — `nested-page-template` hardcodes `schemaType: "page"`; `hiddenTemplateIds` from `singletonTypes`.
- `packages/sanity/src/query.ts` — every query `_type ==` scoped; `querySitemapData` returns `{slugPages, blogPages}`; **`queryRedirects` is called at build time in `apps/web/next.config.ts` — deleting `redirect` type breaks `next build`.** Keep `redirect`.
- `apps/web/src/types.ts` — imports blog query result types; regen after deletion breaks TS.
- `app/llms.txt/route.ts`, `app/api/markdown/route.ts`, `app/api/blog/search/route.ts`, `lib/blog-index.ts`, `lib/markdown.ts`, `lib/json-ld-data.ts` — all reference blog queries.
- `apps/web/tests/e2e/smoke-pages.spec.ts` asserts `/blog` 200; `tests/e2e/fixtures.ts` fetches `slugPages.blogs`; `tests/e2e/table-of-content.spec.ts` navigates a blog post.
- `apps/studio/functions/auto-redirect/` writes `redirect` docs — keep.
- `packages/sanity-blocks/src/internal/blog-categories.ts`; check `faq-accordion.schema.ts` for `faq` doc references.
- `apps/studio/seed-data.tar.gz` contains old types — delete (new seed happens via API separately).

## 7. Seeding / CI / lint

- Seed banner script `apps/studio/scripts/cli-alert-for-data.ts` runs from studio `postinstall` — update or remove its message.
- Biome 2.4.7, `/biome.jsonc` (VCS-aware, lineWidth 80, import-organize assist). Every package: `lint`/`format`/`format:check`/`check-types`.
- CI: `.github/workflows/ci.yml` (lint → format:check → check-types → test), `e2e.yml` (playwright, `pnpm --filter web test:e2e`), `deploy-sanity.yml`, `sanity-template.yml` (template-validation — delete this one).
- Unit tests: vitest only in `packages/sanity-blocks`.

## Target content model (what to build)

- `doc` document (rename of `page`): title, `slug` via `documentSlugField("doc")` (full path e.g. `/getting-started/tool-onboarding`, hierarchy expressed purely by slug segments — same pattern as nested-pages-structure), description, icon (lucide), `orderRank`-style `order` number for sidebar ordering, `hidden` boolean (exclude from nav), body = `richText` (primary authoring surface, fumadocs-style article) plus optional `pageBuilder` for landing-ish docs pages, seo fields.
- `docsIndex` singleton (replaces homePage): title, description, hero-lite intro, featured links.
- `settings`, `navbar` singletons kept (footer optional — delete footer).
- Rich text members: `block`, `image`, `code`, **`muxVideo`** (object with `video: mux.video` + caption), **`callout`** (variant info/warn/success/danger + rich body), **`steps`**, **`tabs`** (code-group capable). Keep block additions minimal but plug-and-play.
- Sidebar tree derived from slugs + order: `queryDocsTree` returns flat `{title, slug, order, icon, hidden}` list; web builds nested tree (mirror of studio nested-pages-structure logic).
