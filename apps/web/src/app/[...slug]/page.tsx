import { Logger } from "@workspace/logger";
import {
  DRAFTS_WITHOUT_SESSION,
  type DynamicFetchOptions,
  getDynamicFetchOptions,
  resolvePageFetchOptions,
  sanityFetch,
  sanityFetchMetadata,
  sanityFetchStaticParams,
} from "@workspace/sanity/live";
import { queryDocBySlug, queryDocPaths } from "@workspace/sanity/query";
import { RichText } from "@workspace/sanity-blocks/internal/rich-text";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { DocsBreadcrumbs } from "@/components/docs/docs-breadcrumbs";
import { DocsPager } from "@/components/docs/docs-pager";
import { DocsToc } from "@/components/docs/docs-toc";
import { MobileTableOfContent } from "@/components/elements/table-of-content";
import { PageBuilderJsonLd } from "@/components/page-builder-json-ld";
import { PageBuilder } from "@/components/pagebuilder";
import {
  type DocsTreeNode,
  flattenDocsTree,
  getDocsNavigation,
} from "@/lib/docs-tree";
import { resolveRedirect } from "@/lib/redirects";
import { seoFromDocument } from "@/lib/seo";
import { hasTocHeadings } from "@/lib/toc";
import type { SanityRichTextProps } from "@/types";
import { PLACEHOLDER_SLUG } from "@/utils";

const logger = new Logger("DocSlug");

const TOC_MAX_DEPTH = 3;

type SlugParams = { slug: string[] };

export async function generateStaticParams() {
  try {
    const { data: slugs } = await sanityFetchStaticParams({
      query: queryDocPaths,
    });
    if (!Array.isArray(slugs) || slugs.length === 0) {
      return [{ slug: [PLACEHOLDER_SLUG] }];
    }
    return slugs.flatMap((slug) =>
      slug ? [{ slug: slug.split("/").filter(Boolean) }] : []
    );
  } catch (error) {
    logger.error("Error fetching document paths", error);
    return [{ slug: [PLACEHOLDER_SLUG] }];
  }
}

async function fetchDocMetadata(
  slug: string,
  perspective: DynamicFetchOptions["perspective"]
) {
  try {
    const { data } = await sanityFetchMetadata({
      query: queryDocBySlug,
      params: { slug },
      perspective,
    });
    return data;
  } catch (error) {
    logger.error("Error fetching document metadata", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SlugParams>;
}): Promise<Metadata> {
  const [{ slug }, { perspective }] = await Promise.all([
    params,
    getDynamicFetchOptions(),
  ]);
  const slugString = `/${slug.join("/")}`;
  const data = await fetchDocMetadata(slugString, perspective);

  if (!data) {
    return {
      title: "Page not found",
      robots: "noindex, nofollow",
      alternates: {},
    };
  }

  return seoFromDocument(data, { slug: slugString });
}

/**
 * No document at this path — consult the same redirect resolver `/api/markdown`
 * uses, so both surfaces agree the moment an editor publishes. Returns only
 * when nothing matches, leaving the caller to fall through to `notFound()`.
 */
async function redirectIfMoved(slug: string[]): Promise<void> {
  const target = await resolveRedirect(`/${slug.join("/")}`);
  if (!target) {
    return;
  }
  if (target.permanent) {
    permanentRedirect(target.destination);
  }
  redirect(target.destination);
}

export default async function DocPage({
  params,
}: Readonly<{ params: Promise<SlugParams> }>) {
  const { isEnabled } = await draftMode();
  if (isEnabled || DRAFTS_WITHOUT_SESSION) {
    const [{ slug }, options] = await Promise.all([
      params,
      resolvePageFetchOptions(),
    ]);
    const { data, tree } = await getDocPage(slug, options);
    if (!data) {
      await redirectIfMoved(slug);
      notFound();
    }
    return <DocContent data={data} slug={slug} tree={tree} />;
  }

  const { slug } = await params;
  const { data, tree } = await getDocPage(slug, {
    perspective: "published",
    stega: false,
  });
  if (!data) {
    await redirectIfMoved(slug);
    notFound();
  }
  return <DocContent data={data} slug={slug} tree={tree} />;
}

async function getDocPage(slug: string[], options: DynamicFetchOptions) {
  "use cache";
  const [document, tree] = await Promise.all([
    sanityFetch({
      query: queryDocBySlug,
      params: { slug: `/${slug.join("/")}` },
      ...options,
    }),
    getDocsNavigation(options),
  ]);
  return { data: document.data, tree };
}

function DocContent({
  data,
  slug,
  tree,
}: Readonly<{
  data: NonNullable<Awaited<ReturnType<typeof getDocPage>>["data"]>;
  slug: string[];
  tree: DocsTreeNode[];
}>) {
  const flat = flattenDocsTree(tree);
  const index = flat.findIndex((item) => item.slug === data.slug);
  const previous = index > 0 ? flat[index - 1] : undefined;
  const next = index >= 0 ? flat[index + 1] : undefined;
  const body = data.body as SanityRichTextProps;
  // Same test the client TOC runs, so a heading-less doc renders no empty TOC.
  const showToc = hasTocHeadings(body, TOC_MAX_DEPTH);

  return (
    <>
      <PageBuilderJsonLd pageBuilder={data.pageBuilder} />
      <main
        // Equal side columns keep the article centred; the TOC hangs in the
        // right one.
        className="grid min-h-[calc(100dvh-3.5rem)] grid-cols-1 gap-12 px-5 py-10 sm:px-8 lg:px-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,37.5rem)_minmax(0,1fr)] xl:gap-16"
      >
        {/* 37.5rem = 600px, measured at ~80 characters per line for 16px
            Geist. The cap lives here, not only on the xl grid column, because
            below xl the article would otherwise run the full viewport
            (~101 characters per line at 1279px). */}
        <article className="mx-auto w-full min-w-0 max-w-[37.5rem] xl:col-start-2">
          <DocsBreadcrumbs slug={slug} title={data.title} />
          <header className="mb-10 border-b pb-8">
            <h1 className="text-balance font-semibold text-h1 sm:text-display">
              {data.title}
            </h1>
            {data.description ? (
              <p className="mt-4 max-w-2xl text-pretty text-lede text-muted-foreground">
                {data.description}
              </p>
            ) : null}
          </header>
          <MobileTableOfContent
            className="mb-8 xl:hidden"
            maxDepth={TOC_MAX_DEPTH}
            richText={body}
            shareTitle={data.title ?? undefined}
          />
          <RichText
            className="prose-p:text-body prose-li:text-body"
            richText={body}
          />
          {data.pageBuilder?.length ? (
            <div className="mt-14 border-t pt-10">
              <PageBuilder
                id={data._id}
                pageBuilder={data.pageBuilder}
                type={data._type}
              />
            </div>
          ) : null}
          <DocsPager next={next} previous={previous} />
        </article>
        {showToc ? <DocsToc body={body} title={data.title} /> : null}
      </main>
    </>
  );
}
