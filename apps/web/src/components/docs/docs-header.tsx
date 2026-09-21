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

// Two round speech bubbles in lucide's style (lucide only ships square ones);
// the back bubble's outline stops where the front one overlaps it.
function ChatBubblesIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M15 9A6 6 0 1 0 3.67 11.73L2.33 15.67L6.27 14.33A6 6 0 0 0 9 15" />
      <path d="M17.73 20.33A6 6 0 1 1 20.33 17.73L21.67 21.67Z" />
    </svg>
  );
}

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
  const chatLink = links.find((link) => link.href === "/chat");
  const navLinks = links.filter((link) => link !== chatLink);

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
        {navLinks.length > 0 ? (
          <nav
            aria-label="Site"
            className="ml-4 hidden items-center gap-1 md:flex"
          >
            {navLinks.map((link) => (
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
        {/* From lg (when the 17rem sidebar appears) centred over the content
            column; below that it sits with the actions, clear of the logo. */}
        <div className="ml-auto lg:absolute lg:left-[calc(50%+8.5rem)] lg:-translate-x-1/2">
          <DocsSearch />
        </div>
        <div className="flex items-center gap-1 lg:ml-auto">
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
          <ThemeToggle className="hidden md:grid" />
          {/* The assistant is the one link we want found: a pill at the end, an
              icon-only circle below md. */}
          {chatLink ? (
            <Link
              className="ml-1 inline-flex size-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-foreground font-medium text-background text-sm transition-[opacity,scale] hover:opacity-90 active:scale-[0.97] md:ml-2 md:w-auto md:pr-3.5 md:pl-3"
              href={chatLink.href ?? "/chat"}
              prefetch={false}
            >
              <ChatBubblesIcon className="size-4" />
              <span className="sr-only md:not-sr-only">{chatLink.name}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
