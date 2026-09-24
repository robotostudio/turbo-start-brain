import { SanityIcon } from "@workspace/sanity-blocks/internal/sanity-icon";
import { RichText } from "@workspace/sanity-blocks/internal/rich-text";
import {
  DRAFTS_WITHOUT_SESSION,
  type DynamicFetchOptions,
  getDynamicFetchOptions,
  resolvePageFetchOptions,
  sanityFetch,
  sanityFetchMetadata,
} from "@workspace/sanity/live";
import { queryDocsIndex } from "@workspace/sanity/query";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";

import { PageBuilder } from "@/components/pagebuilder";
import { DocsToc } from "@/components/docs/docs-toc";
import { DOC_CONTENT, DOC_GRID } from "@/lib/doc-grid";
import { getDocsNavigation } from "@/lib/docs-tree";
import { seoFromDocument } from "@/lib/seo";
import type { SanityRichTextProps } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const { perspective } = await getDynamicFetchOptions();
  const { data } = await sanityFetchMetadata({
    query: queryDocsIndex,
    perspective,
  });
  return seoFromDocument(data, { slug: "/" });
}

export default async function DocsIndexPage() {
  const { isEnabled } = await draftMode();
  if (isEnabled || DRAFTS_WITHOUT_SESSION) {
    return <DocsIndexContent options={await resolvePageFetchOptions()} />;
  }
  return (
    <DocsIndexContent options={{ perspective: "published", stega: false }} />
  );
}

async function DocsIndexContent({
  options,
}: Readonly<{ options: DynamicFetchOptions }>) {
  "use cache";
  const [index, tree] = await Promise.all([
    sanityFetch({ query: queryDocsIndex, ...options }),
    getDocsNavigation(options),
  ]);
  const data = index.data;

  return (
    <main className={DOC_GRID}>
      <div className={DOC_CONTENT}>
        <header className="max-w-3xl">
          {data?.eyebrow ? (
            <p className="mb-4 font-mono text-micro text-muted-foreground uppercase tracking-widest">
              {data.eyebrow}
            </p>
          ) : null}
          <h1 className="text-balance font-semibold text-display sm:text-hero">
            {data?.title ?? "Documentation"}
          </h1>
          {data?.description ? (
            <p className="mt-6 max-w-[37.5rem] text-pretty text-lede text-muted-foreground">
              {data.description}
            </p>
          ) : null}
        </header>

        {data?.intro?.length ? (
          <RichText
            className="mt-10 max-w-[37.5rem] prose-p:text-body prose-li:text-body"
            richText={data.intro as SanityRichTextProps}
          />
        ) : null}

        {data?.featuredLinks?.length ? (
          <section aria-labelledby="featured-heading" className="mt-16">
            <h2 className="font-semibold text-h2" id="featured-heading">
              Featured
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.featuredLinks.map((link) =>
                link.slug ? (
                  <Link
                    className="group flex flex-col border bg-card/40 p-6 transition-colors hover:border-foreground/20 hover:bg-muted"
                    href={link.slug}
                    key={link._id}
                  >
                    <div className="flex items-center gap-3">
                      {link.icon ? (
                        <SanityIcon className="size-5" icon={link.icon} />
                      ) : null}
                      <h3 className="font-medium text-h4">{link.title}</h3>
                    </div>
                    {link.description ? (
                      <p className="mt-3 line-clamp-2 text-muted-foreground text-small">
                        {link.description}
                      </p>
                    ) : null}
                  </Link>
                ) : null
              )}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="sections-heading" className="mt-16">
          <h2 className="font-semibold text-h2" id="sections-heading">
            Browse sections
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {tree.map((section) => (
              <Link
                className="group flex min-h-40 flex-col border bg-card/40 p-6 transition-colors hover:border-foreground/20 hover:bg-muted"
                href={
                  section.document?.slug ?? section.children[0]?.slug ?? "/"
                }
                key={section.slug}
              >
                <div className="flex items-center gap-3">
                  {section.icon ? (
                    <SanityIcon className="size-5" icon={section.icon} />
                  ) : null}
                  <h3 className="font-medium text-h4">{section.title}</h3>
                </div>
                {section.description ? (
                  <p className="mt-3 line-clamp-2 text-muted-foreground text-small">
                    {section.description}
                  </p>
                ) : null}
                <span className="mt-auto flex items-center gap-2 pt-5 font-medium text-small">
                  Explore
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {data?.pageBuilder?.length && data._id ? (
          <section className="mt-16">
            <PageBuilder
              id={data._id}
              pageBuilder={data.pageBuilder}
              type={data._type}
            />
          </section>
        ) : null}
      </div>
      <DocsToc body={data?.intro as SanityRichTextProps} />
    </main>
  );
}
