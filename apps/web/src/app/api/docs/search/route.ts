import { Logger } from "@workspace/logger";
import {
  type DynamicFetchOptions,
  getDynamicFetchOptions,
  sanityFetch,
} from "@workspace/sanity/live";
import { querySearchDocs } from "@workspace/sanity/query";
import Fuse, { type FuseResultMatch } from "fuse.js";
import { NextResponse } from "next/server";

const RESULT_LIMIT = 10;
const SNIPPET_RADIUS = 60;

const logger = new Logger("DocsSearchApi");

async function getSearchableDocs(
  perspective: DynamicFetchOptions["perspective"]
) {
  "use cache";
  const { data } = await sanityFetch({
    query: querySearchDocs,
    perspective,
    stega: false,
  });
  return data;
}

/**
 * A short window of the matched field's text centered on the longest match,
 * so the results list can show why a doc matched.
 */
function buildSnippet(
  matches: readonly FuseResultMatch[] | undefined,
  fallback: string | null
): string {
  const contentMatch = matches?.find(
    (match) => match.key === "content" && match.indices.length > 0
  );
  const firstRange = contentMatch?.indices[0];
  if (!(contentMatch?.value && firstRange)) {
    return fallback ?? "";
  }

  let [start, end] = firstRange;
  for (const [from, to] of contentMatch.indices) {
    if (to - from > end - start) {
      [start, end] = [from, to];
    }
  }

  const text = contentMatch.value;
  const from = Math.max(0, start - SNIPPET_RADIUS);
  const to = Math.min(text.length, end + 1 + SNIPPET_RADIUS);
  const prefix = from > 0 ? "…" : "";
  const suffix = to < text.length ? "…" : "";
  return `${prefix}${text.slice(from, to).trim()}${suffix}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const { perspective } = await getDynamicFetchOptions();

  let data: Awaited<ReturnType<typeof getSearchableDocs>>;
  try {
    data = await getSearchableDocs(perspective);
  } catch (error) {
    logger.error("Error fetching searchable docs", error);
    return NextResponse.json(
      { error: "Search is temporarily unavailable" },
      { status: 503 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  const fuse = new Fuse(data, {
    keys: [
      { name: "title", weight: 3 },
      { name: "description", weight: 2 },
      { name: "slug", weight: 1 },
      { name: "content", weight: 1 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    includeMatches: true,
  });

  const results = fuse.search(query, { limit: RESULT_LIMIT });

  return NextResponse.json(
    results.map(({ item, matches }) => ({
      title: item.title,
      description: item.description,
      slug: item.slug,
      snippet: buildSnippet(matches, item.description),
    }))
  );
}
