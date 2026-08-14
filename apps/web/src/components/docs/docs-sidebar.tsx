"use client";

import { SanityIcon } from "@workspace/sanity-blocks/internal/sanity-icon";
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
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupTrigger,
  SidebarItem,
} from "@workspace/ui/components/sidebar";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { DocsTreeNode } from "@/lib/docs-tree";

function TreeItems({
  nodes,
  onNavigate,
}: Readonly<{ nodes: DocsTreeNode[]; onNavigate?: () => void }>) {
  const pathname = usePathname();

  return nodes.map((node) => {
    const active = pathname === node.slug;
    const within = pathname.startsWith(`${node.slug}/`);
    const icon = node.icon ? (
      <SanityIcon className="size-4 shrink-0" icon={node.icon} />
    ) : null;

    if (node.children.length > 0) {
      return (
        <SidebarGroup key={node.slug} open={active || within || undefined}>
          <SidebarGroupTrigger>
            {icon}
            <span className="truncate">{node.title}</span>
          </SidebarGroupTrigger>
          <SidebarGroupContent className="space-y-0.5 py-0.5">
            {node.document ? (
              <SidebarItem active={active}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className="-m-1.5 flex min-w-0 flex-1 items-center gap-2 p-1.5"
                  href={node.slug}
                  onClick={onNavigate}
                >
                  <span className="truncate">Overview</span>
                </Link>
              </SidebarItem>
            ) : null}
            <TreeItems nodes={node.children} onNavigate={onNavigate} />
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <SidebarItem active={active} key={node.slug}>
        <Link
          aria-current={active ? "page" : undefined}
          className="-m-1.5 flex min-w-0 flex-1 items-center gap-2 p-1.5"
          href={node.slug}
          onClick={onNavigate}
        >
          {icon}
          <span className="truncate">{node.title}</span>
        </Link>
      </SidebarItem>
    );
  });
}

function SidebarNavigation({
  tree,
  className,
  onNavigate,
}: Readonly<{
  tree: DocsTreeNode[];
  className?: string;
  onNavigate?: () => void;
}>) {
  return (
    <Sidebar className={cn("h-full", className)}>
      <ScrollArea className="h-full px-3 py-5">
        <nav aria-label="Documentation" className="space-y-0.5">
          <TreeItems nodes={tree} onNavigate={onNavigate} />
        </nav>
      </ScrollArea>
    </Sidebar>
  );
}

export function DocsSidebar({ tree }: Readonly<{ tree: DocsTreeNode[] }>) {
  return (
    <SidebarNavigation
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] border-sidebar-border border-r lg:block"
      tree={tree}
    />
  );
}

export function DocsMobileSidebar({
  tree,
}: Readonly<{ tree: DocsTreeNode[] }>) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer onOpenChange={setOpen} open={open} swipeDirection="left">
      <DrawerTrigger
        render={
          <Button className="lg:hidden" size="icon" variant="ghost">
            <Menu className="size-5" />
            <span className="sr-only">Open documentation navigation</span>
          </Button>
        }
      />
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport className="justify-start">
          <DrawerPopup className="h-dvh w-[min(22rem,88vw)] border-r">
            <DrawerContent>
              <div className="flex h-14 items-center justify-between border-b px-4">
                <DrawerTitle>Documentation</DrawerTitle>
                <DrawerClose
                  render={
                    <Button size="icon" variant="ghost">
                      <X className="size-4" />
                      <span className="sr-only">Close navigation</span>
                    </Button>
                  }
                />
              </div>
              <SidebarNavigation
                onNavigate={() => setOpen(false)}
                tree={tree}
              />
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}
