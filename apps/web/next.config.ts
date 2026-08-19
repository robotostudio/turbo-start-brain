import "@workspace/env/client";
import "@workspace/env/server";

import { env } from "@workspace/env/client";
import type { NextConfig } from "next";
import { sanity } from "next-sanity/live/cache-life";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/sanity-blocks"],
  reactCompiler: true,
  cacheComponents: true,
  cacheLife: { default: sanity },
  // `experimental.inlineCss` is deliberately OFF. Measured on a production
  // build of this app (Chrome, 100 ms RTT / 5 Mbps): inlining put the whole
  // 131 KB stylesheet in every HTML response (88 KB gzip per page, and again
  // inside the flight payload) and bought 128 ms of FCP on a cold first visit
  // — but cost ~280 ms on every page after that, because the HTML is
  // re-streamed per navigation while an external stylesheet is served once
  // from cache. Cold FCP 288 ms vs 416 ms; second page 428 ms vs 148 ms;
  // HTML 88 KB gzip vs 20 KB + a 22 KB cacheable stylesheet. A docs site is a
  // multi-page session, so the cache wins.
  logging: {
    fetches: {},
  },
  images: {
    minimumCacheTTL: 31_536_000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: `/images/${env.NEXT_PUBLIC_SANITY_PROJECT_ID}/**`,
      },
      {
        protocol: "https",
        hostname: "image.mux.com",
      },
    ],
  },
  // Sanity `redirect` documents are deliberately NOT resolved here: `redirects()`
  // is evaluated once at build time, so it went stale until the next deploy and
  // disagreed with the runtime `.md` surface. Both surfaces now share
  // `src/lib/redirects.ts`, which is cached and self-invalidates on publish.
};

export default nextConfig;
