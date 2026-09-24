"use client";

import { BlossomCarousel } from "@blossom-carousel/react";
import { defineRegistry } from "@json-render/react";
import Link from "next/link";
import { Children } from "react";

import "@blossom-carousel/react/style.css";

import { closeAskAi } from "@/lib/ai/ask-ai-events";
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
      // Blossom is the scroll container itself: native scrolling (zero JS on
      // touch) plus physics-based drag on mouse. `flex!` outranks the
      // library's layered `display: inline-block` so `gap` works. scroll-fade
      // masks only the edge that still has content to reveal.
      <BlossomCarousel className="-mx-4 flex! snap-x snap-proximity gap-3 scroll-fade-x scroll-pl-4 px-4 py-2">
        {Children.toArray(children).slice(0, MAX_DOC_CARDS)}
      </BlossomCarousel>
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
          className="grid! w-64 shrink-0 snap-start gap-1 border bg-card p-4 transition-[opacity,translate,scale,background-color,border-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-2 starting:opacity-0 hover:border-foreground/20 hover:bg-accent active:scale-[0.96] motion-reduce:starting:translate-y-0"
          data-blossom-slide
          href={href}
          onClick={closeAskAi}
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
