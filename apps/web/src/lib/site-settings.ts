import { type DynamicFetchOptions, sanityFetch } from "@workspace/sanity/live";
import {
  queryFeaturedDocs,
  queryGlobalSeoSettings,
} from "@workspace/sanity/query";

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

export async function getFeaturedDocs({
  perspective,
  stega,
}: DynamicFetchOptions) {
  "use cache";
  const { data } = await sanityFetch({
    query: queryFeaturedDocs,
    perspective,
    stega,
  });
  return (data ?? []).filter(
    (doc): doc is typeof doc & { title: string; slug: string } =>
      Boolean(doc?.title && doc.slug)
  );
}
