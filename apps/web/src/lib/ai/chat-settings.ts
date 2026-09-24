import { env } from "@workspace/env/server";
import { sanityFetch } from "@workspace/sanity/live";
import { queryChatSettings } from "@workspace/sanity/query";
import { cacheLife } from "next/cache";

/** Published + stega off: the route puts this in the byte-stable cached
 * prompt prefix. */
export async function getChatSettings() {
  "use cache";
  cacheLife("hours");
  const { data } = await sanityFetch({
    query: queryChatSettings,
    perspective: "published",
    stega: false,
  });
  return data;
}

/** Null unless all three are set: without the Gateway key the model call
 * fails, and without the endpoint and token it would answer from its own
 * knowledge. */
export function getChatConfig() {
  const endpoint = env.SANITY_CONTEXT_MCP_URL;
  const token = env.SANITY_ORGANIZATION_TOKEN;
  return env.AI_GATEWAY_API_KEY && endpoint && token
    ? { endpoint, token }
    : null;
}
