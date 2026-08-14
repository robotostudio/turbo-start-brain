import { faqAccordionSchema } from "./faq-accordion/faq-accordion.schema";
import { featureCardsIconSchema } from "./feature-cards-icon/feature-cards-icon.schema";
import { richTextBlockSchema } from "./rich-text-block/rich-text-block.schema";

export { faqAccordionSchema } from "./faq-accordion/faq-accordion.schema";
export { featureCardsIconSchema } from "./feature-cards-icon/feature-cards-icon.schema";
export { richTextBlockSchema } from "./rich-text-block/rich-text-block.schema";

export const blockSchemas = [
  featureCardsIconSchema,
  faqAccordionSchema,
  richTextBlockSchema,
];
