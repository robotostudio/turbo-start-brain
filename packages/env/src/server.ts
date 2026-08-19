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
  },

  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
  },

  extends: [vercel()],
});

export { env };
