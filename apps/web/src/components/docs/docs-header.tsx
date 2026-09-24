"use client";

import { cn } from "@workspace/tailwind-config/utils";
import type { ComponentProps } from "react";

import { AskAiDialog } from "@/components/ask-ai-dialog";
import { DocsSearch } from "@/components/docs/docs-search";
import {
  DocsMobileSidebar,
  flattenNavbarLinks,
} from "@/components/docs/docs-sidebar";
import { Logo } from "@/components/logo";
import { DOC_CONTENT, DOC_TRACKS } from "@/lib/doc-grid";
import type { DocsTreeNode } from "@/lib/docs-tree";
import type { NavigationData } from "@/types";

export function DocsHeader({
  chat,
  navbar,
  settings,
  tree,
}: Readonly<{
  chat: ComponentProps<typeof AskAiDialog>["chat"];
  navbar: NavigationData["navbarData"];
  settings: NavigationData["settingsData"];
  tree: DocsTreeNode[];
}>) {
  const { logos, siteTitle } = settings ?? {};
  const links = flattenNavbarLinks(navbar);
  const chatLink = links.find((link) => link.href === "/chat");

  return (
    <>
      {/* Mobile only; on desktop the sidebar holds the logo. */}
      <header
        className="sticky top-0 z-40 h-14 border-b bg-background/90 backdrop-blur-lg lg:hidden"
        data-site-header=""
      >
        <div className="flex h-full items-center gap-3 px-4 sm:px-6">
          <DocsMobileSidebar
            buttons={navbar?.buttons}
            links={links}
            tree={tree}
          />
          <Logo
            alt={siteTitle ?? "Home"}
            className="max-h-6 w-auto"
            image={logos?.logo}
            imageDark={logos?.logoDark}
            linkClassName="min-w-0 truncate"
          />
        </div>
      </header>
      {/* Mobile only; on desktop search and Ask AI sit in the sidebar. */}
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-8 z-40 lg:hidden",
          DOC_TRACKS
        )}
      >
        <div className={cn("flex", DOC_CONTENT)}>
          <div className="pointer-events-auto flex items-center gap-2 border border-foreground/20 bg-background/85 p-1.5 backdrop-blur-lg">
            <DocsSearch />
            {chatLink?.name ? (
              <AskAiDialog chat={chat} label={chatLink.name} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
