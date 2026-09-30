"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "docs-sidebar";

export const SIDEBAR_INIT_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`;

/**
 * One toggle for both states so it never vanishes mid-slide: header top-right
 * when open, top-left corner when collapsed. Icons swap via CSS so
 * SIDEBAR_INIT_SCRIPT's pre-paint state is right before hydration.
 */
export function SidebarToggleButton() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(document.documentElement.dataset.sidebar === "collapsed");
  }, []);

  const toggle = () => {
    const next = !collapsed;
    const root = document.documentElement;
    if (next) {
      root.dataset.sidebar = "collapsed";
    } else {
      delete root.dataset.sidebar;
    }
    try {
      localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "open");
    } catch {}
    setCollapsed(next);
  };

  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <button
      aria-expanded={!collapsed}
      aria-label={label}
      className="focus-ring fixed top-2.5 left-3 z-40 hidden size-9 translate-x-[14.75rem] place-items-center bg-foreground/5 text-muted-foreground transition-[color,background-color,translate] duration-(--duration-slow) ease-(--ease-smooth-out) hover:bg-foreground/10 hover:text-foreground motion-reduce:transition-colors lg:grid in-data-[sidebar=collapsed]:translate-x-0 in-data-[sidebar=collapsed]:duration-(--duration-medium)"
      onClick={toggle}
      title={label}
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
    </button>
  );
}
