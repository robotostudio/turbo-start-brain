"use client";

import { defineRegistry } from "@json-render/react";
import Link from "next/link";
import { Children } from "react";

import { docsCatalog } from "@/lib/ai/catalog";

const MAX_DOC_CARDS = 3;

// A bare slug like "delivery/migration-playbook" — the model sometimes drops
// the leading slash despite the catalog regex; normalize instead of dropping
// the card.
const BARE_SLUG_PATTERN = /^[a-z0-9][a-z0-9/-]*$/;

function normalizeHref(href: string) {
  return BARE_SLUG_PATTERN.test(href) ? `/${href}` : href;
}

/**
 * Client-side registry mapping the docs catalog to real components. The
 * catalog regex already constrains `href`, but the model output is untrusted —
 * keep the `startsWith("/")` guard as defense-in-depth against external URLs.
 */
export const { registry } = defineRegistry(docsCatalog, {
  components: {
    DocCardScroller: ({ children }) => (
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-3 py-2">
          {Children.toArray(children).slice(0, MAX_DOC_CARDS)}
        </div>
      </div>
    ),
    DocCard: ({ props }) => {
      const href = normalizeHref(props.href);
      // Reject anything that isn't a site-relative path ("//" would be a
      // protocol-relative external URL).
      if (!href.startsWith("/") || href.startsWith("//")) {
        return null;
      }
      return (
        <Link
          className="grid w-64 shrink-0 gap-1 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
          href={href}
        >
          <span className="text-muted-foreground text-xs">{props.section}</span>
          <span className="font-medium text-sm">{props.title}</span>
          <span className="line-clamp-2 text-muted-foreground text-xs">
            {props.description}
          </span>
        </Link>
      );
    },
  },
  actions: {},
});
