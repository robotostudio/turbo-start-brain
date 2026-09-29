import "@workspace/ui/globals.css";

import {
  DRAFTS_WITHOUT_SESSION,
  type DynamicFetchOptions,
  getDynamicFetchOptions,
  SanityLive,
  sanityFetchMetadata,
} from "@workspace/sanity/live";
import { queryGlobalSeoSettings } from "@workspace/sanity/query";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { Suspense } from "react";
import { preconnect, prefetchDNS } from "react-dom";

import { revalidateSyncTags } from "@/app/actions/revalidate";
import { DocsHeader } from "@/components/docs/docs-header";
import { DocsSidebarFrame } from "@/components/docs/docs-sidebar";
import {
  ExpandSidebarButton,
  SIDEBAR_INIT_SCRIPT,
} from "@/components/docs/sidebar-toggle";
import { CombinedJsonLd } from "@/components/json-ld";
import { PreviewBar } from "@/components/preview-bar";
import { Providers } from "@/components/providers";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getChatConfig, getChatSettings } from "@/lib/ai/chat-settings";
import { getDocsNavigation } from "@/lib/docs-tree";
import { getFeaturedDocs, getSiteSettings } from "@/lib/site-settings";

// The fallback stack is what the first frame renders under `font-display:
// swap`, so it has to be the right family: next/font's default is a
// size-adjusted `local(Arial)` for BOTH faces, which put code blocks in a
// stretched sans until Geist Mono arrived.
//
// `preload: true` is the default but stated for intent. Turbopack currently
// keys next-font-manifest.json by module id ("[project]/apps/web/src/app/…"),
// while getPreloadableFonts looks the route path up — so no
// `<link rel="preload" as="font">` is emitted (verified: 0 matches in the
// built HTML). With `experimental.inlineCss` the @font-face rules ship in the
// document itself, so the browser still discovers both faces at parse time.
const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "Helvetica Neue", "sans-serif"],
});

// Visually hidden until focused: the first Tab on any page reaches it, and it
// jumps past the header and the 60+ sidebar links to the content wrapper.
const SKIP_LINK_CLASS =
  "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-background focus:px-4 focus:py-2.5 focus:font-medium focus:text-foreground focus:text-sm focus:shadow-lg focus:outline-2 focus:outline-ring focus:outline-offset-2";

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: true,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { perspective } = await getDynamicFetchOptions();
  const { data } = await sanityFetchMetadata({
    query: queryGlobalSeoSettings,
    perspective,
  });
  return {
    icons: data?.favicon
      ? { icon: data.favicon }
      : {
          icon: [
            { url: "/favicon.svg", type: "image/svg+xml" },
            { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
          ],
        },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  preconnect("https://cdn.sanity.io");
  prefetchDNS("https://cdn.sanity.io");
  const showDrafts = DRAFTS_WITHOUT_SESSION;
  return (
    // motion-safe:scroll-smooth: in-page TOC anchors rely on native hash
    // navigation; this is what animates the jump (see table-of-content.tsx).
    <html
      className="motion-safe:scroll-smooth"
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_INIT_SCRIPT }} />
        <a className={SKIP_LINK_CLASS} href="#content">
          Skip to content
        </a>
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
}

/**
 * Live updates plus the Presentation overlay, for draft-mode sessions only.
 * The overlay renders wherever a validated draft-mode session exists —
 * production included — which is what lets the deployed Studio preview the
 * live site.
 *
 * `<SanityLive>` is gated on the same session rather than mounted for
 * everyone: it costs an anonymous reader ~85 KB gzip of `@sanity/client` +
 * visual-editing runtime plus a permanently open EventSource to Content Lake.
 * Published content still invalidates without it — the `invalidate-tags`
 * Sanity Function POSTs sync tags to `/api/revalidate-sync-tags` on publish,
 * which is the server-side half of the same mechanism. The only thing an
 * anonymous reader gives up is having an already-open tab re-render itself
 * mid-read; the next navigation is fresh either way.
 */
async function LivePreviewLayer() {
  const { isEnabled: isDraftMode } = await draftMode();
  // Local dev already renders drafts without a session, so keep live updates
  // there too — the gate that matters is the deployed, anonymous one.
  const showLive = isDraftMode || DRAFTS_WITHOUT_SESSION;
  if (!showLive) {
    return null;
  }
  return (
    <>
      <SanityLive action={revalidateSyncTags} includeDrafts={isDraftMode} />
      {isDraftMode ? (
        <>
          <PreviewBar />
          <VisualEditing />
        </>
      ) : null}
    </>
  );
}

async function DynamicDocsShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { perspective, stega } = await getDynamicFetchOptions();
  return (
    <CachedDocsShell perspective={perspective} stega={stega}>
      {children}
    </CachedDocsShell>
  );
}

async function CachedDocsShell({
  perspective,
  stega,
  children,
}: DynamicFetchOptions & { children: React.ReactNode }) {
  const { chat, featured, settings, tree } = await getDocsShellData({
    perspective,
    stega,
  });
  const askAiLabel = getChatConfig() ? chat?.label?.trim() || "Ask AI" : null;

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:in-data-[sidebar=collapsed]:grid-cols-1">
      <DocsSidebarFrame
        askAiLabel={askAiLabel}
        settings={settings}
        tree={tree}
      />
      <ExpandSidebarButton />
      <div className="min-w-0">
        <DocsHeader
          askAiLabel={askAiLabel}
          chat={chat}
          featured={featured}
          settings={settings}
          tree={tree}
        />
        <div className="min-w-0" id="content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}

async function getDocsShellData({ perspective, stega }: DynamicFetchOptions) {
  "use cache";
  const [settingsData, tree, chatSettings, featured] = await Promise.all([
    getSiteSettings({ perspective, stega }),
    getDocsNavigation({ perspective, stega }),
    getChatSettings().catch(() => null),
    getFeaturedDocs({ perspective, stega }),
  ]);

  // `instructions` is part of the system prompt; keep it off the client.
  const chat = chatSettings?.chat;
  return {
    chat: chat
      ? {
          label: chat.label,
          heading: chat.heading,
          intro: chat.intro,
          placeholder: chat.placeholder,
          suggestedQuestions: chat.suggestedQuestions,
        }
      : null,
    featured,
    settings: settingsData,
    tree,
  };
}
