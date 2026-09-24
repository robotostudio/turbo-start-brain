"use client";

import dynamic from "next/dynamic";

/**
 * `next/dynamic`, not a plain import: a `"use client"` module that is merely
 * *reachable* from a route's graph is bundled into that route's entry chunk
 * group and downloaded on load, whether or not it renders. Behind `dynamic`
 * the player (and the xstate machine `@mux/mux-player-react` carries, ~29 KB
 * gz between them) becomes an on-demand chunk that only a page containing an
 * actual `muxVideo` block ever asks for.
 *
 * `ssr: false` because the player is client-only anyway — the surrounding
 * `<figure>`/`<figcaption>` still render on the server, and the placeholder
 * below holds the same aspect box so nothing shifts when it arrives.
 */
const MuxPlayer = dynamic(() => import("@mux/mux-player-react/lazy"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video w-full overflow-hidden border bg-black" />
  ),
});

/** The one genuinely interactive leaf of a `muxVideo` block. */
export function MuxVideo({
  className,
  playbackId,
}: Readonly<{ className?: string; playbackId: string }>) {
  return (
    <MuxPlayer
      className={className}
      playbackId={playbackId}
      streamType="on-demand"
    />
  );
}
