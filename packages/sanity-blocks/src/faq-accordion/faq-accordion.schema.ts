import { MessageCircle } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";

export const faqAccordionSchema = defineType({
  name: "faqAccordion",
  type: "object",
  icon: MessageCircle,
  fields: [
    defineField({
      name: "eyebrow",
      type: "string",
      title: "Eyebrow",
      description:
        "The smaller text that sits above the title to provide context",
    }),
    defineField({
      name: "title",
      type: "string",
      title: "Title",
      description: "The large text that is the primary focus of the block",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subtitle",
      type: "string",
      title: "Subtitle",
      description: "Additional context below the main title",
    }),
    defineField({
      name: "faqs",
      type: "array",
      title: "FAQs",
      description:
        "Choose the questions and answers to show. Add them in the order you want visitors to see them.",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "faq" }],
          // Weak so the block can reference draft/unpublished FAQ docs
          // without failing mutations or triggering a strength mismatch.
          weak: true,
          options: { disableNew: true },
        }),
      ],
      validation: (Rule) => Rule.unique(),
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
    prepare: ({ title }) => ({
      title: title ?? "Untitled",
      subtitle: "FAQ Accordion",
    }),
  },
});
