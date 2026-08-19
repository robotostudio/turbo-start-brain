"use client";

import { useOptimistic } from "@sanity/visual-editing/react";
import type { ReactNode } from "react";

export type OptimisticBlock = {
  readonly key: string;
  readonly node: ReactNode;
};

/**
 * Draft-mode-only wrapper around the server-rendered page-builder blocks.
 *
 * The blocks themselves render on the server and arrive here as finished React
 * nodes; the only thing this client component does is re-order them while an
 * editor drags rows around in Presentation. That keeps
 * `@sanity/visual-editing` out of the bundle for anonymous readers, who never
 * render this component at all.
 */
export type OptimisticBlocksProps = Readonly<{
  blocks: readonly OptimisticBlock[];
  containerDataAttribute: string;
  documentId: string;
}>;

export function OptimisticBlocks({
  blocks,
  containerDataAttribute,
  documentId,
}: OptimisticBlocksProps) {
  // biome-ignore lint/suspicious/noExplicitAny: the mutation stream is untyped
  const ordered = useOptimistic<readonly OptimisticBlock[], any>(
    blocks,
    (currentBlocks, action) => {
      // `action` is untyped and comes off the mutation stream, so a truthy
      // non-array `pageBuilder` would throw out of `for...of` mid-render.
      if (
        action.id !== documentId ||
        !Array.isArray(action.document?.pageBuilder)
      ) {
        return currentBlocks;
      }

      // The action carries the raw document, not the GROQ projection the page
      // rendered from, so only its `_key` order is usable — take that and keep
      // the server-rendered nodes. Keys with no rendered node (a just-inserted
      // one) are dropped until revalidation projects them.
      const resolved = new Map(
        currentBlocks.map((block) => [block.key, block] as const)
      );
      const reordered: OptimisticBlock[] = [];
      for (const raw of action.document.pageBuilder) {
        const block = raw?._key ? resolved.get(raw._key) : undefined;
        if (block) {
          reordered.push(block);
        }
      }
      return reordered;
    }
  );

  return (
    <div
      className="grid min-w-0 grid-cols-1"
      data-sanity={containerDataAttribute}
    >
      {ordered.map((block) => block.node)}
    </div>
  );
}
