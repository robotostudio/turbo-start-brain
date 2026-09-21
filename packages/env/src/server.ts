import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

const env = createEnv({
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },

  server: {
    SANITY_API_READ_TOKEN: z.string().min(1),
    // Shared secret for the `/api/revalidate-sync-tags` webhook. Optional so
    // existing deployments still boot; the webhook fails closed when unset.
    SANITY_REVALIDATE_SECRET: z.string().min(1).optional(),
    // Vercel AI Gateway key for the `/api/chat` docs assistant. Optional so
    // keyless dev/builds still boot; the chat route fails closed when unset.
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
    // AI Gateway model id for the `/api/chat` docs assistant, e.g.
    // `anthropic/claude-sonnet-5`. Optional so Haiku and Sonnet can be A/B'd
    // from project settings; the route defaults to `anthropic/claude-haiku-4.5`.
    CHAT_MODEL: z.string().min(1).optional(),
    // Sanity Context MCP endpoint serving the docs Knowledge Base, and the
    // organisation token (Context Viewer) the `/api/chat` assistant reads it
    // with. Both optional so keyless dev/builds still boot; the chat route
    // fails closed when either is unset.
    SANITY_CONTEXT_MCP_URL: z.url().optional(),
    SANITY_ORGANIZATION_TOKEN: z.string().min(1).optional(),
  },

  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
  },

  // `.env.example` ships the optional keys as bare `NAME=` lines, and copying
  // it verbatim would otherwise hand Zod an empty string — which passes
  // `.optional()` but fails `.min(1)`, throwing at import instead of falling
  // back to the code default. Treat "set to nothing" as "not set".
  emptyStringAsUndefined: true,

  extends: [vercel()],
});

export { env };
