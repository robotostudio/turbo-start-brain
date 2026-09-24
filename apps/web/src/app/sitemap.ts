import { Logger } from "@workspace/logger";
import { sanityFetchMetadata } from "@workspace/sanity/live";
import { querySitemapData } from "@workspace/sanity/query";
import type { QuerySitemapDataResult } from "@workspace/sanity/types";
import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/utils";

type Page = QuerySitemapDataResult["docs"][number];

const baseUrl = getBaseUrl();
const logger = new Logger("Sitemap");

async function getSitemapData(): Promise<QuerySitemapDataResult | null> {
  try {
    const { data } = await sanityFetchMetadata({
      query: querySitemapData,
      perspective: "published",
    });
    return data;
  } catch (error) {
    logger.error("Error fetching sitemap data", error);
    return null;
  }
}

// Real edit times only: a lastmod that always says "now" teaches crawlers to
// ignore it. Google ignores changefreq and priority, so they are omitted.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  return [
    {
      url: baseUrl,
      ...(data?.homeModified
        ? { lastModified: new Date(data.homeModified) }
        : {}),
    },
    ...(data?.docs ?? []).map((page: Page) => ({
      url: `${baseUrl}${page.slug}`,
      lastModified: new Date(page.lastModified),
    })),
  ];
}
