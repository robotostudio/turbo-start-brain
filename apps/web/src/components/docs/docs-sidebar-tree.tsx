"use client";

import { SanityIcon } from "@workspace/sanity-blocks/internal/sanity-icon";
import { cn } from "@workspace/tailwind-config/utils";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupTrigger,
  SidebarItem,
} from "@workspace/ui/components/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { DocsTreeNode } from "@/lib/docs-tree";

function TreeLink({
  active,
  href,
  icon,
  label,
  onNavigate,
}: Readonly<{
  active: boolean;
  href: string;
  icon?: React.ReactNode;
  label?: string | null;
  onNavigate?: () => void;
}>) {
  const [warm, setWarm] = useState(false);
  const warmUp = () => setWarm(true);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className="-m-1.5 flex min-w-0 flex-1 items-center gap-2 p-1.5"
      href={href}
      onClick={onNavigate}
      onFocus={warmUp}
      onMouseEnter={warmUp}
      onTouchStart={warmUp}
      prefetch={warm ? undefined : false}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function TreeItems({
  nodes,
  pathname,
  onNavigate,
}: Readonly<{
  nodes: DocsTreeNode[];
  pathname: string;
  onNavigate?: () => void;
}>) {
  return nodes.map((node) => {
    const active = pathname === node.slug;
    const icon = node.icon ? (
      <SanityIcon className="size-4 shrink-0" icon={node.icon} />
    ) : null;

    if (node.children.length > 0) {
      return (
        <SidebarGroup key={node.slug} open>
          <SidebarGroupTrigger>
            {icon}
            <span className="truncate">{node.title}</span>
          </SidebarGroupTrigger>
          <SidebarGroupContent className="space-y-0.5 py-0.5">
            {node.document ? (
              <SidebarItem active={active}>
                <TreeLink
                  active={active}
                  href={node.slug}
                  label="Overview"
                  onNavigate={onNavigate}
                />
              </SidebarItem>
            ) : null}
            <TreeItems
              nodes={node.children}
              onNavigate={onNavigate}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <SidebarItem active={active} key={node.slug}>
        <TreeLink
          active={active}
          href={node.slug}
          icon={icon}
          label={node.title}
          onNavigate={onNavigate}
        />
      </SidebarItem>
    );
  });
}

function SidebarNavigation({
  tree,
  pathname,
  className,
  onNavigate,
}: Readonly<{
  tree: DocsTreeNode[];
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}>) {
  return (
    <Sidebar className={cn("min-h-0", className)}>
      <ScrollArea className="h-full px-3 pt-2 pb-5">
        <nav aria-label="Documentation" className="space-y-0.5">
          <TreeItems nodes={tree} onNavigate={onNavigate} pathname={pathname} />
        </nav>
      </ScrollArea>
    </Sidebar>
  );
}

const DESKTOP_SIDEBAR_CLASS = "min-h-0 flex-1";

export function DocsSidebar({ tree }: Readonly<{ tree: DocsTreeNode[] }>) {
  const pathname = usePathname();
  return (
    <SidebarNavigation
      className={DESKTOP_SIDEBAR_CLASS}
      pathname={pathname}
      tree={tree}
    />
  );
}

export function DocsSidebarFallback({
  tree,
}: Readonly<{ tree: DocsTreeNode[] }>) {
  return (
    <SidebarNavigation
      className={DESKTOP_SIDEBAR_CLASS}
      pathname=""
      tree={tree}
    />
  );
}

/**
 * The drawer body only mounts once the drawer opens, so `usePathname()` lives
 * here rather than in `DocsMobileSidebar` — keeping the header out of the
 * URL-dependent render path during prerendering.
 */
export function DrawerTree({
  tree,
  onNavigate,
}: Readonly<{ tree: DocsTreeNode[]; onNavigate: () => void }>) {
  const pathname = usePathname();
  return (
    <SidebarNavigation
      className="min-h-0 flex-1"
      onNavigate={onNavigate}
      pathname={pathname}
      tree={tree}
    />
  );
}
