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
    <main className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <header className="max-w-3xl">
        <p className="mb-4 font-mono text-muted-foreground text-sm uppercase tracking-widest">
          Knowledge base
        </p>
        <h1 className="text-balance font-semibold text-5xl tracking-tight sm:text-6xl">
          {data?.title ?? "Documentation"}
        </h1>
        {data?.description ? (
          <p className="mt-6 text-pretty text-muted-foreground text-xl leading-8">
            {data.description}
          </p>
        ) : null}
      </header>

      {data?.intro?.length ? (
        <RichText
          className="mt-10 max-w-3xl prose-lg"
          richText={data.intro as SanityRichTextProps}
        />
      ) : null}

      {data?.featuredLinks?.length ? (
        <section aria-labelledby="featured-heading" className="mt-16">
          <h2 className="font-semibold text-2xl" id="featured-heading">
            Featured
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.featuredLinks.map((link) =>
              link.slug ? (
                <Link
                  className="group flex flex-col rounded-xl border bg-card/40 p-6 transition-colors hover:border-foreground/20 hover:bg-muted"
                  href={link.slug}
                  key={link._id}
                >
                  <div className="flex items-center gap-3">
                    {link.icon ? (
                      <SanityIcon className="size-5" icon={link.icon} />
                    ) : null}
                    <h3 className="font-medium text-lg">{link.title}</h3>
                  </div>
                  {link.description ? (
                    <p className="mt-3 line-clamp-2 text-muted-foreground text-sm leading-6">
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
        <h2 className="font-semibold text-2xl" id="sections-heading">
          Browse sections
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tree.map((section) => (
            <Link
              className="group flex min-h-40 flex-col rounded-xl border bg-card/40 p-6 transition-colors hover:border-foreground/20 hover:bg-muted"
              href={section.document?.slug ?? section.children[0]?.slug ?? "/"}
              key={section.slug}
            >
              <div className="flex items-center gap-3">
                {section.icon ? (
                  <SanityIcon className="size-5" icon={section.icon} />
                ) : null}
                <h3 className="font-medium text-lg">{section.title}</h3>
              </div>
              {section.description ? (
                <p className="mt-3 line-clamp-2 text-muted-foreground text-sm leading-6">
                  {section.description}
                </p>
              ) : null}
              <span className="mt-auto flex items-center gap-2 pt-5 font-medium text-sm">
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
    </main>
  );
}
