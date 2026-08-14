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
      group: GROUP.MAIN_CONTENT,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      group: GROUP.MAIN_CONTENT,
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
    ...seoFields.filter((field) => field.name !== "seoHideFromLists"),
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
