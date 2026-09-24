"use client";

import { cn } from "@workspace/tailwind-config/utils";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  DrawerViewport,
} from "@workspace/ui/components/base-drawer";
import { Button } from "@workspace/ui/components/button";
import { Menu, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { type SidebarData, SidebarPanel } from "@/components/docs/docs-sidebar";
import { DrawerTree } from "@/components/docs/docs-sidebar-tree";
import type { DocsTreeNode } from "@/lib/docs-tree";

const TABLET_QUERY = "(min-width: 48rem)";
const DESKTOP_QUERY = "(min-width: 64rem)";

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

// A full-screen sheet from the bottom on phones, a side panel from md.
const DRAWER_POPUP_CLASS = cn(
  "h-dvh w-full bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground",
  "[transform:translateY(var(--drawer-swipe-movement-y,0px))] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]",
  "md:w-[min(20rem,88vw)] md:border-sidebar-border md:border-r",
  "md:[transform:translateX(var(--drawer-swipe-movement-x,0px))] md:data-ending-style:[transform:translateX(-100%)] md:data-starting-style:[transform:translateX(-100%)]"
);

export function DocsMobileSidebar({
  settings,
  tree,
}: Readonly<SidebarData & { tree: DocsTreeNode[] }>) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  // Close on crossing md (the sheet flips from bottom to side) or lg (the
  // desktop sidebar takes over).
  // biome-ignore lint/correctness/useExhaustiveDependencies: the breakpoints are the trigger; the body only closes.
  useEffect(() => {
    setOpen(false);
  }, [isTablet, isDesktop]);

  return (
    <Drawer
      onOpenChange={setOpen}
      open={open}
      swipeDirection={isTablet ? "left" : "down"}
    >
      <DrawerTrigger
        render={
          <Button
            className="-ml-3 size-11 lg:hidden"
            size="icon"
            variant="ghost"
          >
            <Menu className="size-5" />
            <span className="sr-only">Open documentation navigation</span>
          </Button>
        }
      />
      <DrawerPortal>
        <DrawerBackdrop className="bg-transparent" />
        <DrawerViewport className="items-end justify-start md:items-stretch">
          <DrawerPopup className={DRAWER_POPUP_CLASS}>
            <DrawerContent>
              <DrawerTitle className="sr-only">Navigation</DrawerTitle>
              <SidebarPanel
                action={
                  <DrawerClose
                    render={
                      <Button className="size-11" size="icon" variant="ghost">
                        <X className="size-4" />
                        <span className="sr-only">Close navigation</span>
                      </Button>
                    }
                  />
                }
                settings={settings}
                treeSlot={<DrawerTree onNavigate={close} tree={tree} />}
              />
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
