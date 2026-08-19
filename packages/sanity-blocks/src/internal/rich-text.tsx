import { Logger } from "@workspace/logger";
import { cn } from "@workspace/tailwind-config/utils";
import Link from "next/link";
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import {
  PortableText,
  type PortableTextBlock,
  type PortableTextReactComponents,
} from "@portabletext/react";

import { CodeBlock } from "./code-block";
import { headingChildrenToSlug as parseChildrenToSlug } from "./heading-slug";
import { MuxVideo } from "./mux-video";
import { RichTextTabs } from "./rich-text-tabs";
import { sanitizeHref } from "./safe-href";
import { SanityImage } from "./sanity-image";

const logger = new Logger("RichText");

/** Driven by the `--info`/`--warning`/`--success`/`--danger` theme tokens and
 * their `-surface` companions rather than the raw Tailwind palette, so each
 * variant is re-tuned per theme in one place (globals.css). The surfaces are
 * opaque mixes against `--background`, not alpha washes — an 8% wash was
 * invisible on the dark ground. */
const calloutStyles = {
  info: {
    className: "border-info/35 bg-info-surface",
    iconClassName: "text-info",
    Icon: Info,
  },
  warning: {
    className: "border-warning/40 bg-warning-surface",
    iconClassName: "text-warning",
    Icon: TriangleAlert,
  },
  success: {
    className: "border-success/35 bg-success-surface",
    iconClassName: "text-success",
    Icon: CircleCheck,
  },
  danger: {
    className: "border-danger/35 bg-danger-surface",
    iconClassName: "text-danger",
    Icon: OctagonAlert,
  },
} as const;

/**
 * A `steps` step or `tabs` tab as projected by the GROQ portable-text
 * fragment — a titled section whose `content` is nested portable text.
 * Local rather than generated: query-result types live in
 * `@workspace/sanity`, which itself imports this package's GROQ fragments.
 */
type RichTextSectionItem = {
  _key: string;
  title?: string | null;
  content?: RichTextValue;
};

function sectionItems(value: unknown): RichTextSectionItem[] {
  const items = (value as { items?: unknown })?.items;
  return Array.isArray(items) ? (items as RichTextSectionItem[]) : [];
}

const components: Partial<PortableTextReactComponents> = {
  block: {
    // The Studio only offers H2–H6, but the schema doesn't police what's
    // already stored — seeded, imported or migrated blocks can still carry
    // `style: "h1"`, and @portabletext/react's default would render a real
    // `<h1>` right next to the page's own. Demote it to the H2 renderer so the
    // outline stays single-rooted and no level is skipped. Same slug, so
    // existing anchors keep resolving.
    h1: ({ children, value }) => {
      const slug = parseChildrenToSlug(value.children);
      return (
        <h2
          className="mt-10 mb-3 scroll-m-24 font-semibold text-h3 first:mt-0 sm:text-h2"
          id={slug}
        >
          {children}
        </h2>
      );
    },
    h2: ({ children, value }) => {
      const slug = parseChildrenToSlug(value.children);
      return (
        <h2
          className="mt-10 mb-3 scroll-m-24 font-semibold text-h3 first:mt-0 sm:text-h2"
          id={slug}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, value }) => {
      const slug = parseChildrenToSlug(value.children);
      return (
        <h3
          className="mt-8 mb-2 scroll-m-24 font-semibold text-h4 sm:text-h3"
          id={slug}
        >
          {children}
        </h3>
      );
    },
    h4: ({ children, value }) => {
      const slug = parseChildrenToSlug(value.children);
      return (
        <h4
          className="mt-6 mb-2 scroll-m-24 font-semibold text-body sm:text-h4"
          id={slug}
        >
          {children}
        </h4>
      );
    },
    h5: ({ children, value }) => {
      const slug = parseChildrenToSlug(value.children);
      return (
        <h5 className="mt-6 mb-2 scroll-m-24 font-semibold text-body" id={slug}>
          {children}
        </h5>
      );
    },
    h6: ({ children, value }) => {
      const slug = parseChildrenToSlug(value.children);
      return (
        <h6
          className="mt-6 mb-2 scroll-m-24 font-semibold text-small"
          id={slug}
        >
          {children}
        </h6>
      );
    },
  },
  marks: {
    code: ({ children }) => (
      <code className="rounded-none border border-border bg-zinc-200 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground before:content-none after:content-none lg:whitespace-nowrap dark:bg-zinc-800">
        {children}
      </code>
    ),
    customLink: ({ children, value }) => {
      const safeHref = sanitizeHref(value.href);
      if (!safeHref || safeHref === "#") {
        return (
          <span className="underline decoration-dotted underline-offset-2">
            Link Broken
          </span>
        );
      }
      return (
        // The anchor text is the accessible name. An `aria-label` here would
        // replace it with a raw URL, which is what a screen reader would then
        // read out in place of the words the author wrote.
        <Link
          className="underline decoration-dotted underline-offset-2"
          href={safeHref}
          prefetch={false}
          rel={value.openInNewTab ? "noopener noreferrer" : undefined}
          target={value.openInNewTab ? "_blank" : "_self"}
        >
          {children}
          {value.openInNewTab ? (
            <span className="sr-only"> (opens in a new tab)</span>
          ) : null}
        </Link>
      );
    },
  },
  types: {
    callout: ({ value }) => {
      const variant =
        calloutStyles[value?.variant as keyof typeof calloutStyles] ??
        calloutStyles.info;
      const Icon = variant.Icon;
      return (
        <aside
          className={cn(
            "not-prose my-6 flex gap-3 rounded-xl border p-4 text-small",
            variant.className
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn("mt-0.5 size-5 shrink-0", variant.iconClassName)}
          />
          <RichText
            className="min-w-0 flex-1 prose-p:my-2 prose-p:text-foreground/80 prose-p:text-small prose-p:first:mt-0 prose-p:last:mb-0"
            richText={value?.body}
          />
        </aside>
      );
    },
    code: ({ value }) => {
      if (!value?.code) {
        return null;
      }
      return (
        <CodeBlock
          code={value.code}
          filename={value.filename}
          language={value.language}
        />
      );
    },
    image: ({ value }) => {
      if (!value?.id) {
        return null;
      }
      return (
        <figure className="my-4">
          <SanityImage
            className="h-auto w-full"
            height={900}
            image={value}
            sizes="(min-width: 1024px) 900px, calc(100vw - 40px)"
            width={1600}
          />
          {value?.caption && (
            <figcaption className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    muxVideo: ({ value }) => {
      const playbackId = value?.playbackId;
      if (!playbackId) {
        return null;
      }
      return (
        <figure className="not-prose my-8">
          <MuxVideo
            className="aspect-video w-full overflow-hidden rounded-xl border bg-black"
            playbackId={playbackId}
          />
          {value?.caption ? (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {value.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
    steps: ({ value }) => {
      const items = sectionItems(value);
      if (items.length === 0) {
        return null;
      }
      return (
        <ol className="not-prose my-8 ml-4 border-l">
          {items.map((item, index) => (
            <li className="relative pb-8 pl-8 last:pb-0" key={item._key}>
              <span className="absolute top-0 -left-4 flex size-8 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-sm ring-4 ring-background">
                {index + 1}
              </span>
              <h3 className="mb-2 pt-1 font-semibold text-h4">{item.title}</h3>
              {/* Inherit the page body step so copy inside a step is the same
                  size as copy outside it. */}
              <RichText
                className="prose-p:text-body prose-li:text-body"
                richText={item.content}
              />
            </li>
          ))}
        </ol>
      );
    },
    tabs: ({ value }) => {
      const items = sectionItems(value);
      if (items.length === 0) {
        return null;
      }
      // Panels are rendered here, on the server, and handed to the client
      // shell as nodes — the tab state is the only thing that ships.
      return (
        <RichTextTabs
          items={items.map((item) => ({
            key: item._key,
            title: item.title,
            content: <RichText richText={item.content} />,
          }))}
        />
      );
    },
  },
  hardBreak: () => <br />,
};

// GROQ projections type block children as optional even though a real
// block always has them, so loosen that field rather than requiring `any`
// casts at every call site that passes raw query results in.
type LooseRichTextBlock = Omit<PortableTextBlock, "children" | "markDefs"> & {
  children?: PortableTextBlock["children"];
  markDefs?: PortableTextBlock["markDefs"] | null;
};

export type RichTextValue = LooseRichTextBlock[] | null | undefined;

export function RichText<T extends RichTextValue>({
  richText,
  className,
}: Readonly<{
  richText?: T | null;
  className?: string;
}>) {
  if (!richText) {
    return null;
  }

  return (
    <div
      className={cn(
        // `strong` is the design's highlight treatment: foreground ink at
        // normal weight, not bold.
        "prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-m-24 prose-a:decoration-dotted prose-strong:font-normal prose-strong:text-foreground prose-h2:first:mt-0 dark:prose-headings:text-zinc-100",
        className
      )}
    >
      <PortableText
        components={components}
        onMissingComponent={(_, { nodeType, type }) => {
          logger.warn(`Missing component: ${nodeType} for type: ${type}`);
        }}
        value={richText}
      />
    </div>
  );
}
