import type { RichTextValue } from "@workspace/sanity-blocks/internal/rich-text";
import { RichText } from "@workspace/sanity-blocks/internal/rich-text";

import { FaqAccordionClient, type FaqLink } from "./faq-accordion-client";

export interface FaqItem {
  _key?: string | null;
  _id: string;
  richText?: RichTextValue;
  title?: string | null;
}

export interface FaqCategory {
  _key?: string | null;
  title?: string | null;
  faqs?: FaqItem[] | null;
}

export type { FaqLink };

export interface FaqAccordionProps {
  _key?: string;
  categories?: FaqCategory[] | null;
  eyebrow?: string | null;
  link?: FaqLink | null;
  subtitle?: string | null;
  title?: string | null;
}

/**
 * Server half of the block: it renders each answer's portable text here and
 * hands the resulting nodes to the client disclosure shell. The public props
 * are unchanged — `pagebuilder.tsx` still spreads the raw GROQ result in.
 */
export function FaqAccordion({
  categories,
  ...rest
}: Readonly<FaqAccordionProps>) {
  const renderedCategories = categories?.map((category) => ({
    ...category,
    faqs: category?.faqs?.map((faq) => ({
      _id: faq._id,
      _key: faq._key,
      title: faq.title,
      body: faq.richText?.length ? (
        <RichText className="body-text" richText={faq.richText} />
      ) : null,
    })),
  }));

  return <FaqAccordionClient categories={renderedCategories} {...rest} />;
}
