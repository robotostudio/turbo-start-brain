import { MessageCircle } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";

export const chat = defineType({
  name: "chat",
  type: "document",
  title: "Chat",
  description: "Copy and behaviour of the Ask AI assistant",
  icon: MessageCircle,
  fields: [
    defineField({
      name: "heading",
      type: "string",
      title: "Welcome Heading",
      description:
        "Heading shown above the suggested questions before the conversation starts",
      initialValue: "Ask the docs",
    }),
    defineField({
      name: "intro",
      type: "text",
      rows: 2,
      title: "Welcome Text",
      description:
        "A sentence under the welcome heading explaining what the assistant can do",
      initialValue:
        "Answers come straight from this knowledge base, with links to the pages they were found on.",
    }),
    defineField({
      name: "placeholder",
      type: "string",
      title: "Input Placeholder",
      description: "The hint text shown in the empty question box",
      initialValue: "Ask a question about the docs…",
    }),
    defineField({
      name: "suggestedQuestions",
      type: "array",
      title: "Suggested Questions",
      description:
        "Example questions shown before the visitor asks anything. Clicking one sends it. Keep them short and answerable from your docs",
      of: [defineArrayMember({ type: "string" })],
      validation: (rule) => rule.max(6),
    }),
    defineField({
      name: "instructions",
      type: "text",
      rows: 6,
      title: "Extra Assistant Instructions",
      description:
        "Optional extra guidance for the assistant, such as tone of voice or topics to emphasise. It is added to the built-in rules and cannot override them",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Chat", media: MessageCircle }),
  },
});
