import { env } from "@workspace/env/server";
import { sanityFetch } from "@workspace/sanity/live";
import { queryChatSettings } from "@workspace/sanity/query";
import { cacheLife } from "next/cache";

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

export function getChatConfig() {
  const endpoint = env.SANITY_CONTEXT_MCP_URL;
  const token = env.SANITY_ORGANIZATION_TOKEN;
  return env.AI_GATEWAY_API_KEY && endpoint && token
    ? { endpoint, token }
    : null;
}
