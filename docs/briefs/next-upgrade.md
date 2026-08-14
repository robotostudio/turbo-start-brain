# Next.js Upgrade Brief: 16.2.9 → 16.3.1

Researched 2026-08-14. All versions verified against npm registry the same day.

## Exact versions

| Package | Current in repo | Latest stable | Where pinned |
|---|---|---|---|
| `next` | `16.2.9` | **`16.3.1`** | `apps/web/package.json` line 30 (**NOT** in catalog — pinned exact, no caret) |
| `react` / `react-dom` / `react-is` | catalog `^19.2.4` | **`19.2.8`** | `pnpm-workspace.yaml` catalog |
| `@types/react` | catalog `^19.2.14` | (semver-covered) | catalog |
| `@types/react-dom` | catalog `^19.2.3` | (semver-covered) | catalog |
| `next-sanity` | `13.1.0` (exact) | **`13.3.3`** | `apps/web/package.json` line 31 |
| `typescript` | catalog `5.9.2` (exact pin) | `7.0.2` (optional, see below) | catalog |

npm dist-tags for `next` (2026-08-14): `latest: 16.3.1`, `canary: 16.3.1-canary.16`, `backport: 15.5.23`. Next 16.3.1 peer deps: `react ^18.2.0 || ^19.0.0` — React 19.2.x is fine.

## What to bump, exactly

**Catalog (`/Users/jono/dev/turbo-start-brain/pnpm-workspace.yaml`)** — `next` is *not* a catalog entry, contrary to expectation. Catalog entries relevant to this upgrade:

- `react: ^19.2.4`, `react-dom: ^19.2.4`, `react-is: ^19.2.4` — caret ranges already resolve to 19.2.8 on a fresh `pnpm install`/`pnpm up`; optionally bump the written range to `^19.2.8` for clarity. **No catalog edit strictly required.**
- `typescript: 5.9.2` — exact pin. Only bump (to `^7`) if you want the new TS7-native type-checking in `next build` (opt-in via `useTypeScriptCli` config; verify Biome/Ultracite + `check-types` compatibility first — treat as a separate task).
- Leave `@sanity/client ^7.22.1` on 7.x (npm `latest` is now 8.0.0 — a major; `next-sanity@13.3.3` peers on `@sanity/client ^7.26.2`, which `^7.22.1` resolves to; do NOT jump to 8 in this upgrade).

**Direct deps (`apps/web/package.json`)**:

```jsonc
"next": "16.3.1",        // was 16.2.9
"next-sanity": "13.3.3", // was 13.1.0 — see below, contains a directly relevant SanityLive fix
```

**Install commands** (from repo root; Node 25 needs the IPv4 workaround per MEMORY):

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"
pnpm --filter web add next@16.3.1 next-sanity@13.3.3
pnpm install   # re-resolves catalog carets → react 19.2.8 everywhere
```

## Codemods

For a minor bump (16.2 → 16.3) there are **no required codemods** — 16.3 is additive. The canonical automated path, if preferred:

```bash
npx @next/codemod@latest upgrade latest   # @next/codemod latest = 16.3.1
```

It bumps `next`/`react`/`react-dom` and offers applicable codemods (none apply to 16.2→16.3; the big codemod set was for 15→16: `next-async-request-api`, middleware→proxy rename, etc., already done in this repo). Running it in a pnpm-catalog monorepo can rewrite `catalog:` specifiers to literals — prefer the manual bump above.

## Behavior changes 16.2.9 → 16.3.1 that affect this repo

1. **Turbopack build disk cache on by default** — `next build` now reads unchanged artifacts from `.next/cache` (FileSystem Cache). Faster CI if `.next/cache` is persisted; harmless otherwise. Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache
2. **Dev memory eviction on by default** — up to 90% less RAM in long `next dev` sessions. No action.
3. **`next dev` now writes/maintains an `AGENTS.md` block** pointing at version-matched docs in `node_modules`. It will create/modify `apps/web/AGENTS.md` automatically on first `pnpm dev:web`. This repo uses `CLAUDE.md`; expect a new/changed `AGENTS.md` to show up in git status — decide to commit or gitignore, don't be surprised by it.
4. **Prefetch inlining** — small prefetch payloads are bundled to reduce request count. Default-on, no action. Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/prefetchInlining
5. **Native Node streams in App Router SSR** — ~22% more req/s under load, no code change.
6. **Known 16.3.0/16.3.1 regression (does NOT affect us)**: custom `htmlLimitedBots` matching browser UAs makes cacheable PPR pages `private, no-store` ([#96594](https://github.com/vercel/next.js/issues/96594), still open as of 16.3.1). Our `apps/web/next.config.ts` does not set `htmlLimitedBots` — default config is unaffected. Do not add a custom `htmlLimitedBots` until fixed.
7. **16.3.1 patch fixes** relevant to us: optimistic-routing repeated-prefetch-loop fix; cache entries predating a tag revalidation discarded correctly (matters for `revalidateSyncTags` webhook flow); `unstable_cache` name encoding. Use 16.3.1, not 16.3.0.

## New 16.3 features worth knowing (all opt-in, none required)

- **`partialPrefetching: true`** (top-level next.config flag, pairs with existing `cacheComponents: true`) — Partial Prefetching: per-`<Link prefetch={true}>` control over how much of the target page is prefetched; extracted loading shells cached client-side ("Instant Navigations"). Adoption guide: https://nextjs.org/docs/app/guides/adopting-partial-prefetching . Recommended follow-up, not part of the mechanical upgrade.
- **Better ISR with Cache Components** — pages not covered by `generateStaticParams` serve an instant loading shell to the first visitor, then upgrade to the prerendered page in the background. Free once on 16.3 with `cacheComponents`.
- **Root params** — `import { lang } from 'next/root-params'` (we have no root dynamic segment; N/A).
- **`catchError` custom error boundaries** (`next/error`) — error boundaries that don't swallow `notFound`/`redirect` and can `retry()` server components.
- **`import.meta.glob`** (Turbopack, Vite-compatible), **Instant Insights / Navigation Inspector** devtools, **`instant()` Playwright helper** from `@next/playwright` (could harden our `pnpm test:e2e` suite against shell regressions).
- **Experimental**: `experimental.turbopackRustReactCompiler: true` (we already run `reactCompiler: true` via Babel path — the Rust port is a meaningful dev-startup win but experimental), `experimental.useOffline`.
- `experimental.ppr` config no longer exists in v16 — PPR is subsumed by `cacheComponents: true`, which we already set. No config change needed for the upgrade; `next.config.ts` (`apps/web/next.config.ts`) can stay as-is.

## The "Uncached data or `connection()` was accessed outside of `<Suspense>`" (blocking-route) error

Canonical error doc: https://nextjs.org/docs/messages/blocking-route (see also https://nextjs.org/docs/messages/blocking-prerender-dynamic). With `cacheComponents: true`, **all async IO is dynamic-by-default**; anything awaited during prerender must be either (a) cached with `"use cache"` (with a `cacheLife` long enough to prerender — very short lives like `cacheLife('seconds')` still fail prerender), or (b) below a `<Suspense>` boundary with a fallback. Debugging: the dev overlay names the component; for build-only failures run `next build --debug-prerender` to get prerender stack traces.

### Current structure of our RootLayout (`/Users/jono/dev/turbo-start-brain/apps/web/src/app/layout.tsx`)

The layout already implements the recommended three-layer pattern (this matches the repo's `sanity-live-cache-components` skill). Relevant structure, quoted:

```tsx
const showDrafts = DRAFTS_WITHOUT_SESSION;  // dev-only drafts w/o Presentation session
return (
  <html lang="en" suppressHydrationWarning>
    <body className={...}>
      <Providers>
        <ScrollToTop />
        {showDrafts ? (
          <Suspense
            fallback={
              <CachedDocsShell perspective="published" stega={false}>
                {children}
              </CachedDocsShell>
            }
          >
            <DynamicDocsShell>{children}</DynamicDocsShell>
          </Suspense>
        ) : (
          <CachedDocsShell perspective="published" stega={false}>
            {children}
          </CachedDocsShell>
        )}
        {/* Reads draftMode(), so it must stay behind Suspense — otherwise the
            whole layout opts out of prerendering for every visitor. */}
        <Suspense fallback={null}>
          <LivePreviewLayer />
        </Suspense>
        <Suspense fallback={null}>
          <CombinedJsonLd includeOrganization includeWebsite />
        </Suspense>
      </Providers>
    </body>
  </html>
);
```

with the data access isolated inside a `"use cache"` function:

```tsx
async function CachedDocsShell({ perspective, stega, children }) {
  const { navbar, settings, tree } = await getDocsShellData({ perspective, stega });
  return (/* DocsHeader + DocsSidebar + {children} */);
}

async function getDocsShellData({ perspective, stega }: DynamicFetchOptions) {
  "use cache";
  const [{ navbarData, settingsData }, tree] = await Promise.all([
    getNavigationData({ perspective, stega }),
    getDocsNavigation({ perspective, stega }),
  ]);
  return { navbar: navbarData, settings: settingsData, tree };
}
```

`DynamicDocsShell` awaits `getDynamicFetchOptions()` (reads request state → uncached/dynamic) and is correctly wrapped in `<Suspense>` whose **fallback is the cached published shell** — a strong pattern: the fallback is real UI, not a skeleton. `LivePreviewLayer` awaits `draftMode()` behind its own `<Suspense fallback={null}>`.

### Where the blocking-route error can still come from here

1. **`getDocsShellData`'s effective `cacheLife` too short.** `next.config.ts` sets `cacheLife: { default: sanity }` (from `next-sanity/live/cache-life`). If the profile's revalidate window is in the "seconds" range, the `"use cache"` entry is not prerenderable and the *production* branch (`CachedDocsShell` awaited **outside** any Suspense) triggers exactly this error. Fix options: give `getDocsShellData` an explicit longer profile (`cacheLife("hours")` + `cacheTag(...)` for webhook revalidation — the repo already has `/api/revalidate-sync-tags`), or wrap the production `CachedDocsShell` branch in `<Suspense>` with a skeleton.
2. **`sanityFetch` internals touching request state** (`draftMode()`/`cookies()` for perspective/stega/variant) on a code path not behind Suspense. `next-sanity` 13.2.0 added variant-cookie reads to refetch flows — keep any `sanityFetch` that doesn't go through `getDocsShellData` inside a Suspense boundary or a `"use cache"` scope.
3. **`<SanityLive>` bug fixed in next-sanity 13.1.7**: `<SanityLive />` wrote dynamic bailout markers into prerendered HTML during SSR (fixed by gating behind a post-hydration mount check). We're on 13.1.0 — this alone justifies the `next-sanity` bump and may be the actual source of the layout's prerender bailout.

### Canonical fix patterns for awaited uncached data in a root layout (from the error doc)

- **Pattern A — cache it** (data can be shared across visitors, revalidated by tag):

  ```tsx
  import { cacheLife, cacheTag } from "next/cache";
  async function getShellData() {
    "use cache";
    cacheTag("navigation");
    cacheLife("hours");   // must be long enough to prerender — 'seconds' is not
    return sanityFetch({ query, ... });
  }
  ```

- **Pattern B — Suspense with fallback** (data must be fresh per-request): move the await into a child component, wrap that child in `<Suspense fallback={<ShellSkeleton />}>`. The boundary "can be immediately above the component accessing this data or even in your Root Layout" (error doc). Our layout's variant — using the *cached published shell as the fallback* for the dynamic drafts shell — is the best version of this: no skeleton flash, static-shell PPR preserved.
- **Pattern C — push request APIs down**: don't call `draftMode()`/`cookies()`/`headers()` in the layout body; call them inside the deepest component that needs them, behind Suspense (this is what `LivePreviewLayer` does).
- For pages (not this layout): `await params`/`searchParams` outside Suspense also triggers it; fix via child-component + Suspense, `loading.tsx`, or `generateStaticParams`.

**Do not** "fix" it by making the whole layout dynamic (e.g. removing Suspense or adding `connection()` at the top) — that kills the static shell for every route.

## Recommended upgrade sequence

1. `pnpm --filter web add next@16.3.1 next-sanity@13.3.3` then `pnpm install` (React resolves to 19.2.8 via existing catalog carets; optionally rewrite catalog react entries to `^19.2.8`).
2. `pnpm build:web` — if the blocking-route error appears, run `pnpm --filter web exec next build --debug-prerender` to get the exact component, then apply Pattern A/B above (check `getDocsShellData` cacheLife first).
3. `pnpm check-types && pnpm lint && pnpm test`.
4. `pnpm dev:web` — expect `AGENTS.md` to be written in `apps/web/`; decide commit vs ignore.
5. Follow-up (separate PRs): `partialPrefetching: true`, `@next/playwright` `instant()` e2e assertions, TS7 type-checking, Rust React Compiler.

## Links

- 16.3 release post: https://nextjs.org/blog/next-16-3
- Instant Navigations deep dive: https://nextjs.org/blog/next-16-3-instant-navigations
- Turbopack 16.3: https://nextjs.org/blog/next-16-3-turbopack
- AI improvements: https://nextjs.org/blog/next-16-3-ai-improvements
- blocking-route error doc: https://nextjs.org/docs/messages/blocking-route
- Cache Components migration guide: https://nextjs.org/docs/app/guides/migrating-to-cache-components
- v16.3.1 release: https://github.com/vercel/next.js/releases/tag/v16.3.1
- htmlLimitedBots PPR regression: https://github.com/vercel/next.js/issues/96594
- next-sanity releases: https://github.com/sanity-io/next-sanity/releases
