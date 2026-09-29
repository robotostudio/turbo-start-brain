"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

export type RichTextTabItem = {
  key: string;
  title?: string | null;
  /** Nested portable text, already rendered on the server. */
  content: ReactNode;
};

/**
 * The interactive leaf of a `tabs` block. `rich-text.tsx` renders each panel's
 * nested portable text server-side and hands the result down as `ReactNode`s,
 * so only the tab shell — `@base-ui/react/tabs` and its selection state —
 * crosses the client boundary.
 */
export function RichTextTabs({
  items,
}: Readonly<{ items: RichTextTabItem[] }>) {
  return (
    <Tabs.Root className="not-prose my-8" defaultValue={items[0]?.key}>
      {/* The underline indicator: each tab draws a 2px bottom border on
          the same edge as the list's 1px rule, drawn as an inset shadow
          so the active border overlaps it even while the list scrolls. */}
      <Tabs.List
        aria-label="Content options"
        className="flex gap-4 overflow-x-auto shadow-[inset_0_-1px_0_0_var(--color-border)]"
      >
        {items.map((item) => (
          <Tabs.Tab
            className="whitespace-nowrap border-transparent border-b-2 px-1 pt-1 pb-2.5 font-medium text-base text-muted-foreground outline-none sm:text-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:border-primary data-active:text-foreground"
            key={item.key}
            value={item.key}
          >
            {item.title}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {items.map((item) => (
        <Tabs.Panel
          className="pt-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          key={item.key}
          value={item.key}
        >
          {item.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
