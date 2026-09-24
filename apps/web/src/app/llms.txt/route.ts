import { Logger } from "@workspace/logger";
import { sanityFetch } from "@workspace/sanity/live";
import {
  queryGlobalSeoSettings,
  querySitemapData,
} from "@workspace/sanity/query";
import { absolutizeUrl } from "@workspace/sanity-blocks/internal/portable-text-to-markdown";

import { getBaseUrl } from "@/utils";

const logger = new Logger("LlmsTxt");

const BASE_URL = getBaseUrl();

function mdHref(slug: string): string {
  const path = slug.startsWith("/") ? slug : `/${slug}`;
  return absolutizeUrl(`${path}.md`, BASE_URL);
}

const PUBLISHED = { perspective: "published", stega: false } as const;

const HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
} as const;

async function fetchSettings() {
  "use cache";
  const { data } = await sanityFetch({
    query: queryGlobalSeoSettings,
    ...PUBLISHED,
  });
  return data;
}

// Same source as the sitemap, so "Do not index" pages stay out of both.
async function fetchSlugs() {
  "use cache";
  const { data } = await sanityFetch({
    query: querySitemapData,
    ...PUBLISHED,
  });
  return data?.docs ?? [];
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    )
    .join(" / ");
}

export async function GET(): Promise<Response> {
  const [settingsResult, slugsResult] = await Promise.allSettled([
    fetchSettings(),
    fetchSlugs(),
  ]);

  if (settingsResult.status === "rejected") {
    logger.error("llms.txt: settings fetch failed", settingsResult.reason);
  }
  if (slugsResult.status === "rejected") {
    logger.error("llms.txt: page slugs fetch failed", slugsResult.reason);
  }

  const settings =
    settingsResult.status === "fulfilled" ? settingsResult.value : null;
  const slugs =
    slugsResult.status === "fulfilled" ? (slugsResult.value ?? []) : [];
  const siteTitle = settings?.siteTitle ?? "Documentation";
  const siteDescription = settings?.siteDescription ?? "";

  const pageLines = [
    `- [Home](${mdHref("/index")})`,
    ...slugs
      .filter((doc): doc is typeof doc & { slug: string } => Boolean(doc.slug))
      .map(({ slug, title }) => {
        const path = slug.startsWith("/") ? slug : `/${slug}`;
        return `- [${title?.trim() || slugToTitle(path)}](${mdHref(path)})`;
      }),
  ];

  const body = [
    `# ${siteTitle}`,
    ...(siteDescription ? [`> ${siteDescription}`] : []),
    "",
    "## Pages",
    ...pageLines,
  ].join("\n");

  return new Response(`${body}\n`, { headers: HEADERS });
}
