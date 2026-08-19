"use client";

import dynamic from "next/dynamic";

import type { OptimisticBlocksProps } from "@/components/pagebuilder-optimistic";

/**
 * Keeps `@sanity/visual-editing` out of the route's eager chunk group.
 *
 * `pagebuilder-optimistic.tsx` only ever *renders* in draft mode, but a plain
 * static import from the server component still puts it in the route's client
 * module graph, so every anonymous reader downloaded `useOptimistic` →
 * `@sanity/comlink` → `xstate` on load. `next/dynamic` moves it to an async
 * chunk that is fetched only when this shim actually renders — the same
 * eviction `internal/mux-video.tsx` uses.
 *
 * SSR stays on (no `ssr: false`): the `data-sanity` attributes are computed on
 * the server, and Presentation's overlay needs them in the streamed HTML
 * rather than a frame after hydration.
 */
const OptimisticBlocks = dynamic(() =>
  import("@/components/pagebuilder-optimistic").then(
    (mod) => mod.OptimisticBlocks
  )
);

export function OptimisticBlocksLoader(props: OptimisticBlocksProps) {
  return <OptimisticBlocks {...props} />;
}
