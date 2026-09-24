import { Suspense } from "react";

import { AskAiButton } from "@/components/ask-ai-dialog";
import { SearchButton } from "@/components/docs/docs-search";
import {
  DocsSidebar,
  DocsSidebarFallback,
} from "@/components/docs/docs-sidebar-tree";
import { CollapseSidebarButton } from "@/components/docs/sidebar-toggle";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { DocsTreeNode } from "@/lib/docs-tree";
import type { SiteSettings } from "@/types";

export type SidebarData = {
  settings: SiteSettings;
};

/**
 * Shared by the desktop column and the mobile drawer. The drawer skips search
 * and Ask AI (`showActions`) since the mobile floating bar has them.
 */
export function SidebarPanel({
  askAiLabel,
  settings,
  action,
  treeSlot,
  showActions = false,
}: Readonly<
  SidebarData & {
    action: React.ReactNode;
    askAiLabel?: string | null;
    treeSlot: React.ReactNode;
    showActions?: boolean;
  }
>) {
  const { logos, siteTitle } = settings ?? {};

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 ps-5 pe-3">
        <Logo
          alt={siteTitle ?? "Home"}
          className="max-h-6 w-auto"
          image={logos?.logo}
          imageDark={logos?.logoDark}
          linkClassName="min-w-0 truncate text-base"
        />
        {action}
      </div>
      {showActions ? (
        <div className="grid gap-2 px-3 pb-3">
          <SearchButton className="w-full" />
          {askAiLabel ? (
            <AskAiButton className="w-full" label={askAiLabel} />
          ) : null}
        </div>
      ) : null}
      {treeSlot}
      <ThemeToggle className="h-12 w-full shrink-0 border-sidebar-border border-t" />
    </>
  );
}

export function DocsSidebarFrame({
  askAiLabel,
  settings,
  tree,
}: Readonly<
  SidebarData & { askAiLabel: string | null; tree: DocsTreeNode[] }
>) {
  return (
    <div className="sticky top-0 hidden h-dvh flex-col border-sidebar-border border-r bg-sidebar lg:flex lg:in-data-[sidebar=collapsed]:hidden">
      <SidebarPanel
        action={<CollapseSidebarButton />}
        askAiLabel={askAiLabel}
        showActions
        settings={settings}
        treeSlot={
          // usePathname() makes the tree URL-dependent; the fallback is the
          // same nav without the active row, so the shell still prerenders.
          <Suspense fallback={<DocsSidebarFallback tree={tree} />}>
            <DocsSidebar tree={tree} />
          </Suspense>
        }
      />
    </div>
  );
}
