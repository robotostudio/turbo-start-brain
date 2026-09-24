"use client";

import { SanityButtons } from "@workspace/sanity-blocks/internal/sanity-buttons";
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
import { Suspense, useState, useSyncExternalStore } from "react";

import { AskAiButton } from "@/components/ask-ai-dialog";
import { SearchButton } from "@/components/docs/docs-search";
import { CollapseSidebarButton } from "@/components/docs/sidebar-toggle";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { DocsTreeNode } from "@/lib/docs-tree";
import type { NavigationData } from "@/types";

type NavLink = {
  _key: string;
  name?: string | null;
  href?: string | null;
  openInNewTab?: boolean | null;
};

/**
 * The navbar singleton stores either standalone links or titled columns of
 * links. The docs chrome shows flat rows, so column groupings collapse into
 * their links.
 */
export function flattenNavbarLinks(
  navbar: NavigationData["navbarData"]
): NavLink[] {
  const links: NavLink[] = [];
  for (const column of navbar?.columns ?? []) {
    if (column.type === "link") {
      links.push({
        _key: column._key,
        name: column.name,
        href: column.href,
        openInNewTab: column.openInNewTab,
      });
    } else if (column.type === "column") {
      links.push(...(column.links ?? []));
    }
  }
  return links.filter((link) => link.name && link.href);
}

/**
 * Prefetch on intent, not on sight. The desktop tree puts 50+ links in the
 * viewport at once, and Next's default (`auto`) prefetches every one of them
 * the moment the page loads — ~20 RSC requests racing the page's own JS and
 * fonts. `prefetch={false}` in the App Router disables hover prefetching too,
 * so instead the link starts cold and flips to the default policy on the first
 * hover or focus, which is early enough to still feel instant on click.
 */
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
  openFirst = false,
}: Readonly<{
  nodes: DocsTreeNode[];
  pathname: string;
  onNavigate?: () => void;
  openFirst?: boolean;
}>) {
  return nodes.map((node, index) => {
    const active = pathname === node.slug;
    const within = pathname.startsWith(`${node.slug}/`);
    const icon = node.icon ? (
      <SanityIcon className="size-4 shrink-0" icon={node.icon} />
    ) : null;

    if (node.children.length > 0) {
      return (
        <SidebarGroup
          key={node.slug}
          open={active || within || (openFirst && index === 0)}
        >
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
          <TreeItems
            nodes={tree}
            onNavigate={onNavigate}
            // Outside every section (e.g. the home page) the first one opens.
            openFirst={
              !tree.some(
                (node) =>
                  pathname === node.slug || pathname.startsWith(`${node.slug}/`)
              )
            }
            pathname={pathname}
          />
        </nav>
      </ScrollArea>
    </Sidebar>
  );
}

const DESKTOP_SIDEBAR_CLASS = "min-h-0 flex-1";

type SidebarData = {
  navbar: NavigationData["navbarData"];
  settings: NavigationData["settingsData"];
};

/**
 * Shared by the desktop column and the mobile drawer. The /chat link becomes
 * the Ask AI button; the drawer skips search and Ask AI (`showActions`) since
 * the mobile floating bar has them, and `onNavigate` closes it on link clicks.
 */
function SidebarPanel({
  navbar,
  settings,
  action,
  treeSlot,
  showActions = false,
  onNavigate,
}: Readonly<
  SidebarData & {
    action: React.ReactNode;
    treeSlot: React.ReactNode;
    showActions?: boolean;
    onNavigate?: () => void;
  }
>) {
  const { logos, siteTitle } = settings ?? {};
  const allLinks = flattenNavbarLinks(navbar);
  const chatLink = allLinks.find((link) => link.href === "/chat");
  const links = allLinks.filter((link) => link !== chatLink);

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
          {chatLink?.name ? (
            <AskAiButton className="w-full" label={chatLink.name} />
          ) : null}
        </div>
      ) : null}
      {treeSlot}
      {links.length > 0 || navbar?.buttons?.length ? (
        <div className="grid shrink-0 gap-3 border-sidebar-border border-t px-3 py-3">
          {links.length > 0 ? (
            <nav aria-label="Site" className="grid gap-0.5">
              {links.map((link) => (
                <Link
                  className="focus-ring flex min-h-8 items-center px-2 text-base text-muted-foreground transition-colors sm:text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground max-lg:min-h-11"
                  href={link.href ?? "#"}
                  key={link._key}
                  onClick={onNavigate}
                  prefetch={false}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  target={link.openInNewTab ? "_blank" : undefined}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          ) : null}
          {navbar?.buttons?.length ? (
            <SanityButtons
              buttonClassName="w-full"
              buttons={navbar.buttons}
              className="grid gap-2"
              onClick={onNavigate}
              size="sm"
            />
          ) : null}
        </div>
      ) : null}
      <ThemeToggle className="h-12 w-full shrink-0 border-sidebar-border border-t" />
    </>
  );
}

export function DocsSidebarFrame({
  navbar,
  settings,
  tree,
}: Readonly<SidebarData & { tree: DocsTreeNode[] }>) {
  return (
    <div className="sticky top-0 hidden h-dvh flex-col border-sidebar-border border-r bg-sidebar lg:flex lg:in-data-[sidebar=collapsed]:hidden">
      <SidebarPanel
        action={<CollapseSidebarButton />}
        showActions
        navbar={navbar}
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

function DocsSidebar({ tree }: Readonly<{ tree: DocsTreeNode[] }>) {
  const pathname = usePathname();
  return (
    <SidebarNavigation
      className={DESKTOP_SIDEBAR_CLASS}
      pathname={pathname}
      tree={tree}
    />
  );
}

/**
 * Suspense fallback for {@link DocsSidebar}. Same tree, same markup, minus the
 * `usePathname()` active state — reading the URL is what makes the real sidebar
 * dynamic, so the prerendered shell ships this and the highlighted row streams
 * in. No skeleton flash, because the nav content is identical.
 */
function DocsSidebarFallback({ tree }: Readonly<{ tree: DocsTreeNode[] }>) {
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
function DrawerTree({
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

const TABLET_QUERY = "(min-width: 48rem)";
const subscribeTablet = (onChange: () => void) => {
  const query = window.matchMedia(TABLET_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

// Same as turbo-start-sanity's menu: a full-screen sheet from the bottom on
// phones, a side panel from md. The transforms follow the swipe while dragging.
const DRAWER_POPUP_CLASS = cn(
  "h-dvh w-full bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground",
  "[transform:translateY(var(--drawer-swipe-movement-y,0px))] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]",
  "md:w-[min(20rem,88vw)] md:border-sidebar-border md:border-r",
  "md:[transform:translateX(var(--drawer-swipe-movement-x,0px))] md:data-ending-style:[transform:translateX(-100%)] md:data-starting-style:[transform:translateX(-100%)]"
);

export function DocsMobileSidebar({
  navbar,
  settings,
  tree,
}: Readonly<SidebarData & { tree: DocsTreeNode[] }>) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const isTablet = useSyncExternalStore(
    subscribeTablet,
    () => window.matchMedia(TABLET_QUERY).matches,
    () => false
  );

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
                navbar={navbar}
                onNavigate={close}
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
