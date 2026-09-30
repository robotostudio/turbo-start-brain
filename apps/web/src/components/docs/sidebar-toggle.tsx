"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const STORAGE_KEY = "docs-sidebar";

export const SIDEBAR_INIT_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`;

/**
 * One toggle so it never vanishes mid-slide: header top-right when open, top-left
 * when collapsed. Icons and name swap in CSS off SIDEBAR_INIT_SCRIPT, so they're
 * right before hydration; the name carries the state, hence no aria-expanded.
 */
export function SidebarToggleButton() {
  const toggle = () => {
    const root = document.documentElement;
    const collapse = root.dataset.sidebar !== "collapsed";
    if (collapse) {
      root.dataset.sidebar = "collapsed";
    } else {
      delete root.dataset.sidebar;
    }
    try {
      localStorage.setItem(STORAGE_KEY, collapse ? "collapsed" : "open");
    } catch {}
  };

  return (
    <button
      className="focus-ring fixed top-2.5 left-3 z-40 hidden size-9 translate-x-[14.75rem] place-items-center bg-foreground/5 text-muted-foreground transition-[color,background-color,translate] duration-(--duration-slow) ease-(--ease-smooth-out) hover:bg-foreground/10 hover:text-foreground motion-reduce:transition-colors lg:grid in-data-[sidebar=collapsed]:translate-x-0 in-data-[sidebar=collapsed]:duration-(--duration-medium)"
      onClick={toggle}
      title="Toggle sidebar"
      type="button"
    >
      <PanelLeftClose
        aria-hidden="true"
        className="size-4 in-data-[sidebar=collapsed]:hidden"
      />
      <PanelLeftOpen
        aria-hidden="true"
        className="hidden size-4 in-data-[sidebar=collapsed]:block"
      />
      <span className="sr-only in-data-[sidebar=collapsed]:hidden">
        Collapse sidebar
      </span>
      <span className="sr-only hidden in-data-[sidebar=collapsed]:inline">
        Expand sidebar
      </span>
    </button>
  );
}
