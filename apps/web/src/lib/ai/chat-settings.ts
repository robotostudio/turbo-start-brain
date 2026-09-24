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

/** Without the Gateway key the model call fails; without the endpoint and
 * token it would answer from its own knowledge. */
export function isChatConfigured() {
  return Boolean(
    env.AI_GATEWAY_API_KEY &&
      env.SANITY_CONTEXT_MCP_URL &&
      env.SANITY_ORGANIZATION_TOKEN
  );
}
