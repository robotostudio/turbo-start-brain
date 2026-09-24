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
