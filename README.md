# Turbo Start Brain

A documentation and knowledge base template: a Next.js 16 docs site and a
Sanity Studio 6 CMS in one `pnpm` + Turborepo monorepo. Every page, the
navigation and the site branding are edited in Sanity Studio, and an optional
Ask AI assistant answers questions from your docs.

## Features

- **Nested docs from Sanity.** Pages nest by slug (`/engineering/stack`), and
  the sidebar tree, breadcrumbs data and previous/next links are built from it.
- **Docs layout.** A collapsible sidebar with search and Ask AI at the top, a
  table of contents that tracks the sections on screen, and light, dark and
  system themes.
- **Search.** ⌘K / Ctrl K search across titles, descriptions and body text
  (Fuse.js over your published docs, no external service).
- **Ask AI (optional).** A chat dialog that answers only from a Sanity Context
  Knowledge Base and links every answer back to the page it came from.
- **Markdown for LLMs.** Any page is also served as Markdown: append `.md` to
  the URL or send `Accept: text/markdown`. Each page has a "Copy as markdown"
  button, and `/llms.txt` lists every page.
- **Page builder.** Rich text and FAQ accordion blocks you can add to any page,
  each with its own schema, query, component and Markdown serializer.
- **Editing.** Sanity Visual Editing and Presentation, live preview, redirects
  managed in Studio, and an automatic redirect when a page's slug changes.

## Repo layout

```txt
apps/
  web/                Next.js 16 docs site (App Router, React 19, Tailwind CSS v4)
  studio/             Sanity Studio 6
packages/
  sanity/             Sanity client, GROQ queries, live helpers, generated types
  sanity-blocks/      Page builder blocks: schema, query, component, Markdown, tests
  ui/                 Shared UI components and the Tailwind theme
  env/                Zod-validated environment variables for the web app
  logger/             Structured logger
  tailwind-config/    Shared Tailwind setup and the `cn` helper
  typescript-config/  Shared TypeScript configs
```

[CLAUDE.md](CLAUDE.md) covers the architecture in more depth, including the
checklist for adding a page builder block.

## Requirements

- Node.js `>=22.12`
- pnpm `10.32.1`, pinned via `packageManager`: run `corepack enable`
- A [Sanity](https://www.sanity.io/) account

## Getting started

The web app validates its environment at startup, so you need a Sanity project
and a read token before `pnpm dev` will run.

### 1. Clone and install

```sh
git clone https://github.com/robotostudio/turbo-start-brain.git
cd turbo-start-brain
corepack enable
pnpm install
```

### 2. Set up a Sanity project

1. Create a project at [sanity.io/manage](https://www.sanity.io/manage) and
   note its **Project ID** and **dataset** (usually `production`).
2. Under **API → Tokens**, create a token with the **Viewer** role. This is
   `SANITY_API_READ_TOKEN`.
3. Under **API → CORS origins**, add `http://localhost:3000` and
   `http://localhost:3333` with **Allow credentials** enabled.

### 3. Configure environment variables

```sh
cp apps/web/.env.example apps/web/.env
cp apps/studio/.env.example apps/studio/.env
```

**`apps/web/.env`** (validated by `@workspace/env`; the app won't start if a
required value is missing):

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Yes | Your project ID. |
| `NEXT_PUBLIC_SANITY_DATASET` | Yes | Usually `production`. |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Yes | Pre-filled. |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | Yes | Your local or deployed Studio URL. |
| `SANITY_API_READ_TOKEN` | Yes | The Viewer token from step 2. |
| `SANITY_REVALIDATE_SECRET` | No | Shared secret for `/api/revalidate-sync-tags`; the route rejects everything while unset. |
| `AI_GATEWAY_API_KEY` | No | Enables Ask AI. See [Ask AI](#ask-ai-optional). |
| `SANITY_CONTEXT_MCP_URL` | No | Enables Ask AI. |
| `SANITY_ORGANIZATION_TOKEN` | No | Enables Ask AI. |
| `CHAT_MODEL` | No | AI Gateway model id; defaults to `anthropic/claude-haiku-4.5`. |

**`apps/studio/.env`** (plain `process.env`, no validation):

| Variable | Required | Notes |
| --- | --- | --- |
| `SANITY_STUDIO_PROJECT_ID` | Yes | Same project as the web app. |
| `SANITY_STUDIO_DATASET` | Yes | Same dataset as the web app. |
| `SANITY_STUDIO_TITLE` | No | Studio display name. |
| `SANITY_STUDIO_PRESENTATION_URL` | Outside dev | The web URL Presentation previews; defaults to `http://localhost:3000` in development only. |
| `SANITY_STUDIO_API_VERSION` | No | Defaults to `2025-05-08`. |
| `SANITY_STUDIO_APP_ID` | No | Returned by your first `sanity deploy`. |
| `NEXT_PUBLIC_SITE_URL`, `SANITY_REVALIDATE_SECRET` | No | Used only by the deployed `invalidate-tags` Sanity Function. |

### 4. Run the apps

```sh
pnpm dev
```

- Web: `http://localhost:3000`
- Studio: `http://localhost:3333`

### 5. Add your content

The template ships without content, so a new project starts empty. In Studio:

1. **Site Configuration → Global Settings**: site title, description, logos,
   favicon and social links.
2. **Docs Home**: the home page title, intro and featured pages.
3. **Docs by Path**: your pages. A slug like `/getting-started/setup` nests the
   page under `/getting-started` in the sidebar.
4. **Site Configuration → Navigation**: links shown at the bottom of the
   sidebar. A link to `/chat` turns on the Ask AI button and sets its label.
5. **Site Configuration → Chat** (optional): the Ask AI welcome text, input
   placeholder, suggested questions and extra instructions.

## Ask AI (optional)

Ask AI answers only from a Sanity Context
[Knowledge Base](https://www.sanity.io/docs/ai/sanity-context-knowledge-bases)
built from your docs, through the Vercel AI Gateway. Until it's configured the
site runs docs-only and `/api/chat` returns `503`.

1. **Enable Knowledge Bases.** They are an opt-in beta: an organisation admin
   turns them on from the [Labs page](https://www.sanity.io/manage/org/labs) in
   Sanity Manage.
2. **Build a Knowledge Base** from your docs dataset
   ([guide](https://www.sanity.io/docs/ai/sanity-context-create-knowledge-base)).
   It is a pre-built index, so set a refresh schedule or rebuild it after
   editing docs, otherwise answers lag behind the site.
3. **Create an MCP endpoint** in the Context app (Dashboard) with that
   Knowledge Base as its source, and copy its URL into
   `SANITY_CONTEXT_MCP_URL`. It looks like
   `https://api.sanity.io/v1/context/organizations/<orgId>/mcp/<name>`
   ([reference](https://www.sanity.io/docs/ai/sanity-context-mcp)).
4. **Create an organisation token** (Manage → your organisation → API → Tokens)
   with **Context Viewer** permission and set it as
   `SANITY_ORGANIZATION_TOKEN`. A project token will not work (`403`).
5. **Create an AI Gateway key** (Vercel dashboard → AI Gateway → API keys) and
   set it as `AI_GATEWAY_API_KEY`. Optionally set `CHAT_MODEL` to another
   Gateway model id (default `anthropic/claude-haiku-4.5`).
6. **Turn on the button:** in Studio, add a link to `/chat` under
   **Site Configuration → Navigation**; its label becomes the button text.
7. **Customise it (optional)** under **Site Configuration → Chat**: welcome
   heading and text, input placeholder, suggested questions and extra
   instructions for the assistant. Chat settings are read from the
   **published** document, so publish to see changes.

## Commands

```sh
pnpm dev              # Both apps
pnpm dev:web          # Web only
pnpm dev:studio       # Studio only

pnpm build            # Build everything
pnpm build:web
pnpm build:studio

pnpm lint             # Biome (Ultracite), not ESLint/Prettier
pnpm format
pnpm format:check
pnpm check-types

pnpm test             # Vitest (packages/sanity-blocks)
pnpm test:e2e         # Playwright smoke tests against a running site
```

### After schema changes

Type generation reads the extracted schema, so extract first:

```sh
pnpm --filter studio extract
pnpm type
```

Types are written to `packages/sanity/src/sanity.types.ts`; the web app derives
every content type from that file.

## Content model

- **Singletons:** `docsIndex` (docs home), `settings`, `navbar`, `chat`
- **Documents:** `doc` (a docs page), `faq`, `redirect`
- **Page builder blocks:** `richTextBlock`, `faqAccordion` (one folder each in
  `packages/sanity-blocks/src`)

## Deploying

### Web app

Deploy `apps/web` (for example on Vercel, with the root directory set to
`apps/web`), add the web environment variables, and add the production URL to
Sanity CORS origins with credentials allowed.

### Sanity Studio

```sh
cd apps/studio
pnpm run deploy
```

Use `pnpm run deploy`, not `pnpm deploy`, which is pnpm's own command. Save the
app ID from the first deploy as `SANITY_STUDIO_APP_ID`. After that you can also
deploy from GitHub with the manual `.github/workflows/deploy-sanity.yml`
workflow, which needs the `SANITY_DEPLOY_TOKEN`, `SANITY_STUDIO_PROJECT_ID`,
`SANITY_STUDIO_DATASET`, `SANITY_STUDIO_TITLE`,
`SANITY_STUDIO_PRESENTATION_URL` and `SANITY_STUDIO_APP_ID` repository secrets.

### Sanity Functions

`apps/studio/sanity.blueprint.ts` defines two Sanity Functions:

- **`auto-redirect`** creates a redirect from a page's old slug to its new one
  when the slug changes on publish.
- **`invalidate-tags`** refreshes the web app's cache when content is published.
  It posts to `/api/revalidate-sync-tags`, so it needs `NEXT_PUBLIC_SITE_URL`
  and a `SANITY_REVALIDATE_SECRET` matching the web app's.

Deploy them with the Sanity CLI's blueprints commands from `apps/studio`.

## Troubleshooting

**`pnpm dev` exits with an env validation error.** A required variable in
`apps/web/.env` is missing; see the table in step 3.

**The site is empty.** The dataset has no content yet; see step 5.

**Presentation shows a blank or blocked preview.** Add the web URL to
**API → CORS origins** with credentials allowed, and check
`SANITY_STUDIO_PRESENTATION_URL` matches it.

**Ask AI says it isn't available.** One of `AI_GATEWAY_API_KEY`,
`SANITY_CONTEXT_MCP_URL` or `SANITY_ORGANIZATION_TOKEN` is missing.

**Wrong pnpm version.** Run `corepack enable`.

## Continuous integration

- `.github/workflows/ci.yml`: lint, format check, type check and unit tests on
  pushes and pull requests to `main`.
- `.github/workflows/e2e.yml`: Playwright smoke tests on successful deployments.
- `.github/workflows/deploy-sanity.yml`: manual Studio deploy.

## Contributing

Bug reports and pull requests are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md),
and report security issues privately as described in
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
