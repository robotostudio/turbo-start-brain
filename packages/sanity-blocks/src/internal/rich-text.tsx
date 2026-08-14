"use client";

import { Tabs } from "@base-ui/react/tabs";
import MuxPlayer from "@mux/mux-player-react/lazy";
import { Logger } from "@workspace/logger";
import { cn } from "@workspace/tailwind-config/utils";
import Link from "next/link";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import {
  PortableText,
  type PortableTextBlock,
  type PortableTextReactComponents,
} from "next-sanity";

import { CodeBlock } from "./code-block";
import { headingChildrenToSlug as parseChildrenToSlug } from "./heading-slug";
import { sanitizeHref } from "./safe-href";
import { SanityImage } from "./sanity-image";

const logger = new Logger("RichText");

const calloutStyles = {
  info: {
    className:
      "border-blue-500/40 bg-blue-500/8 text-blue-950 dark:text-blue-100",
    Icon: Info,
  },
  warning: {
    className:
      "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    Icon: CircleAlert,
  },
  success: {
    className:
      "border-emerald-500/40 bg-emerald-500/8 text-emerald-950 dark:text-emerald-100",
    Icon: CircleCheck,
  },
  danger: {
    className: "border-red-500/40 bg-red-500/8 text-red-950 dark:text-red-100",
    Icon: CircleX,
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
          className="mt-12 mb-8 scroll-m-20 font-medium text-4xl leading-[48px] tracking-[-0.24px] first:mt-0"
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
          className="mt-12 mb-8 scroll-m-20 font-medium text-4xl leading-[48px] tracking-[-0.24px] first:mt-0"
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
          className="scroll-m-20 font-medium text-3xl leading-10 tracking-[-0.24px]"
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
          className="scroll-m-20 font-medium text-2xl leading-8 tracking-[-0.24px]"
          id={slug}
        >
          {children}
        </h4>
      );
    },
    h5: ({ children, value }) => {
      const slug = parseChildrenToSlug(value.children);
      return (
        <h5 className="scroll-m-20 font-medium text-xl leading-7" id={slug}>
          {children}
        </h5>
      );
    },
    h6: ({ children, value }) => {
      const slug = parseChildrenToSlug(value.children);
      return (
        <h6 className="scroll-m-20 font-medium text-lg leading-7" id={slug}>
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
            "not-prose my-6 flex gap-3 rounded-lg border-l-4 p-4",
            variant.className
          )}
        >
          <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <RichText
            className="min-w-0 flex-1 prose-p:my-0"
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
          <MuxPlayer
            className="aspect-video w-full overflow-hidden rounded-xl border bg-black"
            playbackId={playbackId}
            streamType="on-demand"
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
              <span className="absolute top-0 -left-4 flex size-8 items-center justify-center rounded-full border bg-background font-semibold text-sm">
                {index + 1}
              </span>
              <h3 className="mb-2 font-semibold text-lg">{item.title}</h3>
              <RichText richText={item.content} />
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
      const defaultValue = items[0]?._key;
      return (
        <Tabs.Root
          className="not-prose my-8 overflow-hidden rounded-lg border"
          defaultValue={defaultValue}
        >
          <Tabs.List
            aria-label="Content options"
            className="flex gap-1 overflow-x-auto border-b bg-muted/40 p-1"
          >
            {items.map((item) => (
              <Tabs.Tab
                className="rounded-md px-3 py-1.5 font-medium text-muted-foreground text-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-active:bg-background data-active:text-foreground data-active:shadow-sm"
                key={item._key}
                value={item._key}
              >
                {item.title}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {items.map((item) => (
            <Tabs.Panel
              className="p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              key={item._key}
              value={item._key}
            >
              <RichText richText={item.content} />
            </Tabs.Panel>
          ))}
        </Tabs.Root>
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
