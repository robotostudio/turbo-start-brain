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
import { notFound } from "next/navigation";

import { DocsBreadcrumbs } from "@/components/docs/docs-breadcrumbs";
import { DocsPager } from "@/components/docs/docs-pager";
import { DocsToc } from "@/components/docs/docs-toc";
import { MobileTableOfContent } from "@/components/elements/table-of-content";
import { PageBuilderJsonLd } from "@/components/page-builder-json-ld";
import { PageBuilder } from "@/components/pagebuilder";
import {
  flattenDocsTree,
  getDocsNavigation,
  type DocsTreeNode,
} from "@/lib/docs-tree";
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
  const { data } = await sanityFetchMetadata({
    query: queryDocBySlug,
    params: { slug: slugString },
    perspective,
  });
  return seoFromDocument(data, { slug: slugString });
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
      <main className="grid min-h-[calc(100dvh-3.5rem)] grid-cols-1 gap-12 px-5 py-10 sm:px-8 lg:px-12 xl:grid-cols-[minmax(0,48rem)_14rem] xl:justify-center xl:gap-16">
        <article className="min-w-0">
          <DocsBreadcrumbs slug={slug} title={data.title} />
          <header className="mb-10 border-b pb-8">
            <h1 className="text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              {data.title}
            </h1>
            {data.description ? (
              <p className="mt-4 max-w-2xl text-pretty text-lg text-muted-foreground leading-8">
                {data.description}
              </p>
            ) : null}
          </header>
          <MobileTableOfContent
            className="mb-8 xl:hidden"
            maxDepth={3}
            richText={body}
            shareTitle={data.title ?? undefined}
          />
          <RichText
            className="prose-lg prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-8"
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
        <DocsToc body={body} title={data.title} />
      </main>
    </>
  );
}
