"use client";

import { defineRegistry } from "@json-render/react";
import Link from "next/link";
import { Children } from "react";

import { docsCatalog } from "@/lib/ai/catalog";

const MAX_DOC_CARDS = 3;

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
      // Reject anything that isn't a site-relative path ("//" would be a
      // protocol-relative external URL).
      if (!props.href.startsWith("/") || props.href.startsWith("//")) {
        return null;
      }
      return (
        <Link
          className="grid w-64 shrink-0 gap-1 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
          href={props.href}
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
