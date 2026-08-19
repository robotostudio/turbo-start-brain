import { Logger } from "@workspace/logger";
import { sanityFetchMetadata } from "@workspace/sanity/live";
import { querySitemapData } from "@workspace/sanity/query";
import type { QuerySitemapDataResult } from "@workspace/sanity/types";
import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/utils";

type Page = QuerySitemapDataResult["docs"][number];

const baseUrl = getBaseUrl();
const logger = new Logger("Sitemap");

async function getSitemapDocs(): Promise<QuerySitemapDataResult["docs"]> {
  try {
    const { data } = await sanityFetchMetadata({
      query: querySitemapData,
      perspective: "published",
    });
    return data?.docs ?? [];
  } catch (error) {
    logger.error("Error fetching sitemap data", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await getSitemapDocs();
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...docs.map((page: Page) => ({
      url: `${baseUrl}${page.slug}`,
      lastModified: new Date(page.lastModified ?? new Date()),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
