# Studio

The Sanity Studio v6 workspace for Turbo Start Brain. Run it from the
repository root with `pnpm dev:studio` (or `pnpm dev` for both apps); it serves
on `http://localhost:3333`.

Setup and environment variables are documented in the
[root README](../../README.md#getting-started). This Studio needs
`SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` in `apps/studio/.env` to
start.

## Layout

```txt
schemaTypes/
  documents/       doc, faq, redirect and the docsIndex, settings, navbar, chat singletons
  definitions/     Shared field objects and the pageBuilder array
components/        Custom Studio components and the nested docs structure
functions/         Sanity Functions (auto-redirect, invalidate-tags)
utils/             Studio helpers and constants
static/            Generated block thumbnails for the insert menu
```

Page builder block schemas do not live here: they come from
`@workspace/sanity-blocks` and are merged in `schemaTypes/index.ts`.

## Scripts

```sh
pnpm dev                # sanity dev on http://localhost:3333
pnpm build              # sanity build
pnpm run deploy         # sanity deploy (note `run`; `pnpm deploy` is a pnpm builtin)
pnpm extract            # sanity schema extract -> schema.json
pnpm type               # sanity typegen generate -> packages/sanity/src/sanity.types.ts
pnpm sync-thumbnails    # copy block thumbnails into static/thumbnails
```

After a schema change, run `pnpm extract` before `pnpm type`.
