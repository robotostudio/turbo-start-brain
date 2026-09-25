import { BookIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

import {
  documentSlugField,
  iconField,
  pageBuilderField,
} from "@/schemaTypes/common";
import { GROUP, GROUPS } from "@/utils/constant";
import { ogFields } from "@/utils/og-fields";
import { seoFields } from "@/utils/seo-fields";

export const doc = defineType({
  name: "doc",
  type: "document",
  title: "Document",
  icon: BookIcon,
  groups: GROUPS,
  fields: [
    defineField({
      name: "title",
      type: "string",
      description:
        "The page name, shown as the heading, in the sidebar and in search results",
      group: GROUP.MAIN_CONTENT,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      description:
        "One or two sentences on what the page covers. Shown under the title, in search results, on home page cards and in search engine snippets",
      group: GROUP.MAIN_CONTENT,
      validation: (rule) => [
        rule
          .custom((value) =>
            value?.trim()
              ? true
              : "Add a description so search and cards have a summary"
          )
          .warning(),
        rule
          .max(160)
          .warning(
            "Search engines cut descriptions after about 160 characters"
          ),
      ],
    }),
    documentSlugField("doc", { group: GROUP.MAIN_CONTENT }),
    iconField,
    defineField({
      name: "order",
      type: "number",
      description: "Lower numbers appear first in the documentation sidebar.",
      group: GROUP.MAIN_CONTENT,
      initialValue: 0,
    }),
    defineField({
      name: "hidden",
      type: "boolean",
      description: "Hide this document from navigation and the docs index.",
      group: GROUP.MAIN_CONTENT,
      initialValue: false,
    }),
    defineField({
      name: "body",
      type: "richText",
      title: "Content",
      group: GROUP.MAIN_CONTENT,
    }),
    pageBuilderField,
    ...seoFields,
    ...ogFields,
  ],
  preview: {
    select: { title: "title", slug: "slug.current" },
    prepare: ({ title, slug }) => ({
      title: title || "Untitled document",
      subtitle: slug || "No URL",
    }),
  },
});
