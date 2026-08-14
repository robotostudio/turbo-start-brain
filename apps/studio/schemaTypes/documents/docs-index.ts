import { HomeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

import { documentSlugField, pageBuilderField } from "@/schemaTypes/common";
import { GROUP, GROUPS } from "@/utils/constant";
import { ogFields } from "@/utils/og-fields";
import { seoFields } from "@/utils/seo-fields";

export const docsIndex = defineType({
  name: "docsIndex",
  type: "document",
  title: "Docs home",
  icon: HomeIcon,
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
    documentSlugField("docsIndex", { group: GROUP.MAIN_CONTENT }),
    defineField({
      name: "intro",
      type: "richText",
      title: "Introduction",
      group: GROUP.MAIN_CONTENT,
    }),
    defineField({
      name: "featuredLinks",
      type: "array",
      group: GROUP.MAIN_CONTENT,
      of: [
        defineField({
          name: "featuredLink",
          type: "reference",
          to: [{ type: "doc" }],
        }),
      ],
    }),
    pageBuilderField,
    ...seoFields.filter(
      (field) => !["seoNoIndex", "seoHideFromLists"].includes(field.name)
    ),
    ...ogFields,
  ],
  initialValue: {
    slug: { _type: "slug", current: "/" },
  },
  preview: {
    select: { title: "title" },
    prepare: ({ title }) => ({ title: title || "Docs home" }),
  },
});
