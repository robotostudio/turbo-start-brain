import { env } from "@workspace/env/client";
import { FaqAccordion } from "@workspace/sanity-blocks/faq-accordion/index";
import { RichTextBlock } from "@workspace/sanity-blocks/rich-text-block/index";
import { cn } from "@workspace/tailwind-config/utils";
import { draftMode } from "next/headers";
import { createDataAttribute } from "next-sanity";

import { OptimisticBlocksLoader } from "@/components/pagebuilder-optimistic-loader";
import type { PageBuilderBlock, PagebuilderType } from "@/types";

export type PageBuilderProps = {
  readonly pageBuilder?: PageBuilderBlock[];
  readonly id: string;
  readonly type: string;
};

type SanityDataAttributeConfig = {
  readonly id: string;
  readonly type: string;
  readonly path: string;
};

/**
 * Renders the component for a single block, asserting the query result
 * against its PagebuilderType so a GROQ or schema rename breaks the build
 * instead of silently passing through `any`.
 */
function renderBlockComponent(block: PageBuilderBlock) {
  switch (block?._type) {
    case "faqAccordion":
      return <FaqAccordion {...(block as PagebuilderType<"faqAccordion">)} />;
    case "richTextBlock":
      return <RichTextBlock {...(block as PagebuilderType<"richTextBlock">)} />;
    default:
      return null;
  }
}

function createSanityDataAttribute(config: SanityDataAttributeConfig): string {
  return createDataAttribute({
    id: config.id,
    baseUrl: env.NEXT_PUBLIC_SANITY_STUDIO_URL,
    projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: env.NEXT_PUBLIC_SANITY_DATASET,
    type: config.type,
    path: config.path,
  }).toString();
}

function UnknownBlockError({
  blockType,
  blockKey,
}: {
  blockType: string;
  blockKey: string;
}) {
  return (
    <div
      aria-label={`Unknown block type: ${blockType}`}
      className="flex items-center justify-center border-2 border-muted-foreground/20 border-dashed bg-muted p-8 text-center text-muted-foreground"
      key={`${blockType}-${blockKey}`}
      role="alert"
    >
      <div className="space-y-2">
        <p>Component not found for block type:</p>
        <code className="bg-background px-2 py-1 font-mono text-sm">
          {blockType}
        </code>
      </div>
    </div>
  );
}

function renderBlock(block: PageBuilderBlock, dataSanity?: string) {
  const content = block && renderBlockComponent(block);
  const key = `${block?._type}-${block?._key}`;

  if (!content) {
    // Only editors (draft mode) see the error; readers get nothing, as in the
    // Markdown output, so a removed block type never shows up on the site.
    if (!dataSanity) {
      return null;
    }
    return (
      <UnknownBlockError
        blockKey={block?._key ?? ""}
        blockType={block?._type ?? "unknown"}
        key={key}
      />
    );
  }

  return (
    <div
      className={cn("relative z-10 min-w-0 bg-background")}
      data-sanity={dataSanity}
      key={key}
    >
      {content}
    </div>
  );
}

/**
 * Server component. Blocks render on the server for every visitor; the
 * `data-sanity` attributes and the `useOptimistic` reorder wrapper — the only
 * parts that need Presentation — are added on top of that server output, and
 * only for a draft-mode session. An anonymous reader therefore downloads no
 * visual-editing runtime for this tree at all.
 */
export async function PageBuilder({
  pageBuilder: initialBlocks = [],
  id,
  type,
}: PageBuilderProps) {
  const { isEnabled: isDraftMode } = await draftMode();

  if (!initialBlocks.length) {
    return null;
  }

  if (!isDraftMode) {
    return (
      <div className="grid min-w-0 grid-cols-1">
        {initialBlocks.map((block) => renderBlock(block))}
      </div>
    );
  }

  const blocks = initialBlocks.map((block) => ({
    key: block?._key ?? "",
    node: renderBlock(
      block,
      createSanityDataAttribute({
        id,
        type,
        path: `pageBuilder[_key=="${block?._key}"]`,
      })
    ),
  }));

  return (
    <OptimisticBlocksLoader
      blocks={blocks}
      containerDataAttribute={createSanityDataAttribute({
        id,
        type,
        path: "pageBuilder",
      })}
      documentId={id}
    />
  );
}
