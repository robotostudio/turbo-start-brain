import type { RichTextValue } from "@workspace/sanity-blocks/internal/rich-text";
import { RichText } from "@workspace/sanity-blocks/internal/rich-text";

import { FaqAccordionClient } from "./faq-accordion-client";

export interface FaqItem {
  _key?: string | null;
  _id: string;
  richText?: RichTextValue;
  title?: string | null;
}

export interface FaqAccordionProps {
  _key?: string;
  faqs?: FaqItem[] | null;
  eyebrow?: string | null;
  subtitle?: string | null;
  title?: string | null;
}

/**
 * Server half of the block: it renders each answer's portable text here and
 * hands the resulting nodes to the client disclosure shell. The public props
 * are unchanged — `pagebuilder.tsx` still spreads the raw GROQ result in.
 */
export function FaqAccordion({ faqs, ...rest }: Readonly<FaqAccordionProps>) {
  const renderedFaqs = faqs?.map((faq) => ({
    _id: faq._id,
    _key: faq._key,
    title: faq.title,
    body: faq.richText?.length ? (
      <RichText
        className="body-text prose-p:text-body prose-li:text-body"
        richText={faq.richText}
      />
    ) : null,
  }));

  return <FaqAccordionClient faqs={renderedFaqs} {...rest} />;
}
