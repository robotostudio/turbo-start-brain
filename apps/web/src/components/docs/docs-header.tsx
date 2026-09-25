import type { ComponentProps } from "react";

import { AskAiDialog } from "@/components/ask-ai-dialog";
import { DocsSearch } from "@/components/docs/docs-search";
import { DocsMobileSidebar } from "@/components/docs/docs-mobile-sidebar";
import { Logo } from "@/components/logo";
import { DOC_CONTENT, DOC_TRACKS } from "@/lib/doc-grid";
import type { DocsTreeNode } from "@/lib/docs-tree";
import type { SiteSettings } from "@/types";

export function DocsHeader({
  askAiLabel,
  chat,
  featured,
  settings,
  tree,
}: Readonly<{
  askAiLabel: string | null;
  chat: ComponentProps<typeof AskAiDialog>["chat"];
  featured: ComponentProps<typeof DocsSearch>["featured"];
  settings: SiteSettings;
  tree: DocsTreeNode[];
}>) {
  const { logos, siteTitle } = settings ?? {};

  return (
    <>
      <header
        className="sticky top-0 z-40 h-14 border-b bg-background/90 backdrop-blur-lg lg:hidden"
        data-site-header=""
      >
        <div className={`${DOC_TRACKS} h-full`}>
          <div className="flex items-center gap-2">
            <DocsMobileSidebar settings={settings} tree={tree} />
            <Logo
              alt={siteTitle ?? "Home"}
              className="max-h-6 w-auto"
              image={logos?.logo}
              imageDark={logos?.logoDark}
              linkClassName="min-w-0 truncate"
            />
          </div>
        </div>
      </header>
      <div
        className={`${DOC_TRACKS} pointer-events-none fixed inset-x-0 bottom-8 z-40 lg:hidden`}
      >
        <div className={`${DOC_CONTENT} flex justify-center`}>
          <div className="pointer-events-auto flex w-full items-center gap-2 border border-foreground/20 bg-background/85 p-1.5 backdrop-blur-lg sm:w-auto">
            <DocsSearch featured={featured} tree={tree} />
            {askAiLabel ? <AskAiDialog chat={chat} label={askAiLabel} /> : null}
          </div>
        </div>
      </div>
    </>
  );
}
