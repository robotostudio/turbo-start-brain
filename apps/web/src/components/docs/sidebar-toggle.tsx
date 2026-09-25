"use client";

import { cn } from "@workspace/tailwind-config/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const STORAGE_KEY = "docs-sidebar";

export const SIDEBAR_INIT_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`;

function setCollapsed(collapsed: boolean) {
  const root = document.documentElement;
  if (collapsed) {
    root.dataset.sidebar = "collapsed";
  } else {
    delete root.dataset.sidebar;
  }
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "open");
  } catch {}
  document
    .querySelector<HTMLElement>(
      `[data-sidebar-toggle="${collapsed ? "expand" : "collapse"}"]`
    )
    ?.focus();
}

const SIDEBAR_ICON_BUTTON_CLASS =
  "focus-ring grid size-9 shrink-0 place-items-center bg-foreground/5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground";

export function CollapseSidebarButton({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <button
      aria-expanded="true"
      aria-label="Collapse sidebar"
      className={cn(SIDEBAR_ICON_BUTTON_CLASS, className)}
      data-sidebar-toggle="collapse"
      onClick={() => setCollapsed(true)}
      title="Collapse sidebar"
      type="button"
    >
      <PanelLeftClose aria-hidden="true" className="size-4" />
    </button>
  );
}

export function ExpandSidebarButton() {
  return (
    <button
      aria-expanded="false"
      aria-label="Expand sidebar"
      className={`${SIDEBAR_ICON_BUTTON_CLASS} fixed top-3 left-3 z-40 hidden lg:in-data-[sidebar=collapsed]:grid`}
      data-sidebar-toggle="expand"
      onClick={() => setCollapsed(false)}
      title="Expand sidebar"
      type="button"
    >
      <PanelLeftOpen aria-hidden="true" className="size-4" />
    </button>
  );
}
