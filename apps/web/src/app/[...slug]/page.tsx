import { Logger } from "@workspace/logger";
import {
  DRAFTS_WITHOUT_SESSION,
  type DynamicFetchOptions,
  getDynamicFetchOptions,
  sanityFetch,
  sanityFetchMetadata,
  sanityFetchStaticParams,
} from "@workspace/sanity/live";
import { queryDocBySlug, queryDocPaths } from "@workspace/sanity/query";
import { RichText } from "@workspace/sanity-blocks/internal/rich-text";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { ancestorCrumbs, BreadcrumbsJsonLd } from "@/components/breadcrumbs";
import { CopyMarkdownButton } from "@/components/copy-markdown-button";
import { DocsPager } from "@/components/docs/docs-pager";
import { DocsToc, TOC_MAX_DEPTH } from "@/components/docs/docs-toc";
import { MobileTableOfContent } from "@/components/elements/table-of-content";
import { PageBuilderJsonLd } from "@/components/page-builder-json-ld";
import { PageBuilder } from "@/components/pagebuilder";
import { DOC_CONTENT, DOC_GRID } from "@/lib/doc-grid";
import {
  type DocsTreeNode,
  flattenDocsTree,
  getDocsNavigation,
} from "@/lib/docs-tree";
import { resolveRedirect } from "@/lib/redirects";
import { seoFromDocument } from "@/lib/seo";
import type { SanityRichTextProps } from "@/types";
import { PLACEHOLDER_SLUG } from "@/utils";

const logger = new Logger("DocSlug");

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

const PUBLISHED_OPTIONS: DynamicFetchOptions = {
  perspective: "published",
  stega: false,
};

export default async function DocPage({
  params,
}: Readonly<{ params: Promise<SlugParams> }>) {
  const { isEnabled } = await draftMode();
  const [{ slug }, options] = await Promise.all([
    params,
    isEnabled || DRAFTS_WITHOUT_SESSION
      ? getDynamicFetchOptions()
      : PUBLISHED_OPTIONS,
  ]);
  const { data, tree } = await getDocPage(slug, options);
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

  return (
    <>
      <PageBuilderJsonLd pageBuilder={data.pageBuilder} />
      <main className={DOC_GRID}>
        <article className={DOC_CONTENT}>
          <BreadcrumbsJsonLd
            crumbs={[...ancestorCrumbs(slug), { label: data.title }]}
          />
          <header className="mb-10 border-b pb-8">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <h1 className="text-balance break-words font-semibold text-h1 sm:text-display">
                {data.title}
              </h1>
              <CopyMarkdownButton className="justify-self-start max-sm:order-first" />
            </div>
            {data.description ? (
              <p className="mt-4 max-w-2xl text-pretty text-lede text-muted-foreground">
                {data.description}
              </p>
            ) : null}
          </header>
          <MobileTableOfContent
            className="mb-8 max-w-160 xl:hidden"
            maxDepth={TOC_MAX_DEPTH}
            richText={body}
          />
          <RichText
            className="prose-p:max-w-160 prose-p:text-body prose-li:max-w-160 prose-li:text-body"
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
        <DocsToc body={body} />
      </main>
    </>
  );
}
