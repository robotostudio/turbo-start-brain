import "@workspace/ui/globals.css";

import {
  DRAFTS_WITHOUT_SESSION,
  type DynamicFetchOptions,
  getDynamicFetchOptions,
  SanityLive,
} from "@workspace/sanity/live";
import { Geist, Geist_Mono } from "next/font/google";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { Suspense } from "react";
import { preconnect, prefetchDNS } from "react-dom";

import { revalidateSyncTags } from "@/app/actions/revalidate";
import { DocsHeader } from "@/components/docs/docs-header";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { CombinedJsonLd } from "@/components/json-ld";
import { PreviewBar } from "@/components/preview-bar";
import { Providers } from "@/components/providers";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getDocsNavigation } from "@/lib/docs-tree";
import { getNavigationData } from "@/lib/navigation";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  preconnect("https://cdn.sanity.io");
  prefetchDNS("https://cdn.sanity.io");
  // In local dev, navigation follows drafts too (like page content), so navbar
  // and settings edits are visible without a Presentation session.
  // Production stays static published.
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
 * Live updates plus the Presentation overlay. The overlay renders wherever a
 * validated draft-mode session exists — production included — which is what
 * lets the deployed Studio preview the live site.
 */
async function LivePreviewLayer() {
  const { isEnabled: isDraftMode } = await draftMode();
  return (
    <>
      <SanityLive action={revalidateSyncTags} includeDrafts={isDraftMode} />
      {isDraftMode && (
        <>
          <PreviewBar />
          <VisualEditing />
        </>
      )}
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
  const { navbar, settings, tree } = await getDocsShellData({
    perspective,
    stega,
  });

  return (
    <div className="min-h-dvh bg-background">
      <DocsHeader navbar={navbar} settings={settings} tree={tree} />
      <div className="mx-auto grid max-w-[100rem] grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <DocsSidebar tree={tree} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

async function getDocsShellData({ perspective, stega }: DynamicFetchOptions) {
  "use cache";
  const [{ navbarData, settingsData }, tree] = await Promise.all([
    getNavigationData({ perspective, stega }),
    getDocsNavigation({ perspective, stega }),
  ]);

  return { navbar: navbarData, settings: settingsData, tree };
}
