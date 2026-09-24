import { type DynamicFetchOptions, sanityFetch } from "@workspace/sanity/live";
import { queryGlobalSeoSettings } from "@workspace/sanity/query";

export async function getSiteSettings({
  perspective,
  stega,
}: DynamicFetchOptions) {
  "use cache";
  const { data } = await sanityFetch({
    query: queryGlobalSeoSettings,
    perspective,
    stega,
  });
  return data;
}
