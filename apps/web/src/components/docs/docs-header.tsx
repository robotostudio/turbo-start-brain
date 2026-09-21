"use client";

import { SanityButtons } from "@workspace/sanity-blocks/internal/sanity-buttons";
import { Github } from "lucide-react";
import Link from "next/link";

import { DocsSearch } from "@/components/docs/docs-search";
import {
  DocsMobileSidebar,
  type MobileNavLink,
} from "@/components/docs/docs-sidebar";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { DocsTreeNode } from "@/lib/docs-tree";
import type { NavigationData } from "@/types";

type HeaderLink = MobileNavLink;

/**
 * The navbar singleton stores either standalone links or titled columns of
 * links. The docs top bar is a single flat row, so column groupings collapse
 * into their links.
 */
function flattenNavbarLinks(
  navbar: NavigationData["navbarData"]
): HeaderLink[] {
  const links: HeaderLink[] = [];
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

export function DocsHeader({
  navbar,
  settings,
  tree,
}: Readonly<{
  navbar: NavigationData["navbarData"];
  settings: NavigationData["settingsData"];
  tree: DocsTreeNode[];
}>) {
  const { logos, siteTitle } = settings ?? {};
  const links = flattenNavbarLinks(navbar);

  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background/90 backdrop-blur-lg">
      <div className="relative flex h-full items-center gap-3 px-4 sm:px-6">
        <DocsMobileSidebar
          buttons={navbar?.buttons}
          links={links}
          tree={tree}
        />
        <Logo
          alt={siteTitle ?? "Turbo Start Brain"}
          className="max-h-6 w-auto"
          image={logos?.logo}
          imageDark={logos?.logoDark}
          linkClassName="shrink-0"
        />
        {links.length > 0 ? (
          <nav
            aria-label="Site"
            className="ml-4 hidden items-center gap-1 md:flex"
          >
            {links.map((link) => (
              <Link
                className="rounded-md px-3 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                href={link.href ?? "#"}
                key={link._key}
                prefetch={false}
                rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                target={link.openInNewTab ? "_blank" : undefined}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        ) : null}
        {/* Centred over the content column (right of the 17rem sidebar from
            lg); beside the actions on mobile. */}
        <div className="ml-auto md:absolute md:left-1/2 md:-translate-x-1/2 lg:left-[calc(50%+8.5rem)]">
          <DocsSearch />
        </div>
        <div className="flex items-center gap-1 md:ml-auto">
          {navbar?.buttons?.length ? (
            <SanityButtons
              buttons={navbar.buttons}
              className="mr-1 hidden sm:flex"
              size="sm"
            />
          ) : null}
          {navbar?.gitHubUrl ? (
            <a
              aria-label="GitHub repository"
              className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-muted"
              href={navbar.gitHubUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github className="size-4" />
            </a>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
