import {
  BlockContentIcon,
  CodeBlockIcon,
  ImageIcon,
  LinkIcon,
  PlayIcon,
  SplitVerticalIcon,
  ThListIcon,
} from "@sanity/icons";
import {
  type ConditionalProperty,
  defineArrayMember,
  defineField,
} from "sanity";

// Single source of truth for portable text member names
const PORTABLE_TEXT_MEMBER_NAMES = {
  block: "block",
  image: "image",
  code: "code",
  muxVideo: "muxVideo",
  callout: "callout",
  steps: "steps",
  tabs: "tabs",
} as const;

const CODE_LANGUAGES = [
  { title: "TypeScript", value: "ts" },
  { title: "TSX", value: "tsx" },
  { title: "JavaScript", value: "js" },
  { title: "GROQ", value: "groq" },
  { title: "Bash", value: "bash" },
  { title: "JSON", value: "json" },
  { title: "CSS", value: "css" },
];

// Members that may appear at any nesting depth. Callout, steps and tabs
// bodies reuse exactly this set (instead of the full `richText` type), so the
// GROQ portable-text fragment only ever needs to project one level of
// nesting — a callout inside a step can never smuggle in members the
// nested projection doesn't resolve (links, videos).
const baseRichTextMembers = [
  defineArrayMember({
    name: PORTABLE_TEXT_MEMBER_NAMES.block,
    type: "block",
    styles: [
      { title: "Normal", value: "normal" },
      { title: "H2", value: "h2" },
      { title: "H3", value: "h3" },
      { title: "H4", value: "h4" },
      { title: "H5", value: "h5" },
      { title: "H6", value: "h6" },
      { title: "Inline", value: "inline" },
    ],
    lists: [
      { title: "Numbered", value: "number" },
      { title: "Bullet", value: "bullet" },
    ],
    marks: {
      annotations: [
        {
          name: "customLink",
          type: "object",
          title: "Internal/External Link",
          icon: LinkIcon,
          fields: [
            defineField({
              name: "customLink",
              type: "customUrl",
              description:
                "Where the highlighted text takes visitors — pick a page on this site or paste a web address",
            }),
          ],
        },
      ],
      decorators: [
        { title: "Strong", value: "strong" },
        { title: "Emphasis", value: "em" },
        { title: "Code", value: "code" },
      ],
    },
  }),
  defineArrayMember({
    name: PORTABLE_TEXT_MEMBER_NAMES.image,
    type: "image",
    title: "Image",
    icon: ImageIcon,
    options: {
      hotspot: true,
    },
    fields: [
      defineField({
        name: "alt",
        type: "string",
        title: "Alternative Text",
        description: "Describe the image for screen readers and search engines",
      }),
      defineField({
        name: "caption",
        type: "string",
        title: "Caption Text",
        description: "Optional caption shown beneath the image.",
      }),
    ],
  }),
  defineArrayMember({
    name: PORTABLE_TEXT_MEMBER_NAMES.code,
    type: "object",
    title: "Code Block",
    description:
      "A multi-line code snippet with preserved indentation. Use this for code examples instead of the inline Code style.",
    icon: CodeBlockIcon,
    fields: [
      defineField({
        name: "code",
        type: "text",
        title: "Code",
        description: "The code snippet. Indentation and line breaks are kept.",
        rows: 8,
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: "language",
        type: "string",
        title: "Language",
        description: "Optional language label shown in the code block header.",
        options: {
          list: CODE_LANGUAGES,
        },
      }),
      defineField({
        name: "filename",
        type: "string",
        title: "Filename",
        description: "Optional filename shown in the code block header.",
      }),
    ],
    preview: {
      select: {
        filename: "filename",
        language: "language",
        code: "code",
      },
      prepare({ filename, language, code }) {
        const firstLine = (code ?? "").split("\n")[0]?.trim();
        return {
          title: filename || firstLine || "Code Block",
          subtitle: language ?? "Code",
        };
      },
    },
  }),
  defineArrayMember({
    name: PORTABLE_TEXT_MEMBER_NAMES.muxVideo,
    type: "object",
    title: "Video",
    icon: PlayIcon,
    fields: [
      defineField({
        name: "video",
        type: "mux.video",
        validation: (rule) => rule.required(),
      }),
      defineField({ name: "caption", type: "string" }),
    ],
  }),
];

const richTextMembers = [
  ...baseRichTextMembers,
  defineArrayMember({
    name: PORTABLE_TEXT_MEMBER_NAMES.callout,
    type: "object",
    title: "Callout",
    icon: BlockContentIcon,
    fields: [
      defineField({
        name: "variant",
        type: "string",
        initialValue: "info",
        options: {
          list: ["info", "warning", "success", "danger"],
          layout: "radio",
        },
      }),
      defineField({
        name: "body",
        type: "array",
        of: baseRichTextMembers,
        validation: (rule) => rule.required(),
      }),
    ],
  }),
  defineArrayMember({
    name: PORTABLE_TEXT_MEMBER_NAMES.steps,
    type: "object",
    title: "Steps",
    icon: ThListIcon,
    fields: [
      defineField({
        name: "items",
        type: "array",
        validation: (rule) => rule.min(1).required(),
        of: [
          defineArrayMember({
            name: "step",
            type: "object",
            fields: [
              defineField({
                name: "title",
                type: "string",
                validation: (rule) => rule.required(),
              }),
              defineField({
                name: "content",
                type: "array",
                of: baseRichTextMembers,
                validation: (rule) => rule.required(),
              }),
            ],
          }),
        ],
      }),
    ],
  }),
  defineArrayMember({
    name: PORTABLE_TEXT_MEMBER_NAMES.tabs,
    type: "object",
    title: "Tabs",
    icon: SplitVerticalIcon,
    fields: [
      defineField({
        name: "items",
        type: "array",
        validation: (rule) => rule.min(1).required(),
        of: [
          defineArrayMember({
            name: "tab",
            type: "object",
            fields: [
              defineField({
                name: "title",
                type: "string",
                validation: (rule) => rule.required(),
              }),
              defineField({
                name: "content",
                type: "array",
                of: baseRichTextMembers,
                validation: (rule) => rule.required(),
              }),
            ],
          }),
        ],
      }),
    ],
  }),
];

export const portableTextMemberTypes = Object.values(
  PORTABLE_TEXT_MEMBER_NAMES
);

export type PortableTextMemberType = (typeof portableTextMemberTypes)[number];

export const definePortableTextField = (
  memberTypes: PortableTextMemberType[],
  options?: {
    description?: string;
    group?: string[] | string;
    hidden?: ConditionalProperty;
    name?: string;
    title?: string;
  }
) => {
  if (memberTypes.length === 0) {
    throw new Error(
      "definePortableTextField requires at least one member type"
    );
  }

  const invalidMemberTypes = memberTypes.filter(
    (type) => !portableTextMemberTypes.includes(type)
  );
  if (invalidMemberTypes.length > 0) {
    throw new Error(
      `definePortableTextField received unsupported member types: ${invalidMemberTypes.join(", ")}`
    );
  }

  const { description = "", hidden, name = "richText" } = options ?? {};
  const selectedMembers = richTextMembers.filter(
    (member) => member.name && memberTypes.includes(member.name)
  );

  return defineField({
    ...options,
    name,
    type: "array",
    description,
    hidden,
    of: selectedMembers,
  });
};
