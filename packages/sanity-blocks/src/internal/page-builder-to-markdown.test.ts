import {
  type MarkdownBlock,
  pageBuilderToMarkdown,
} from "@workspace/sanity-blocks/internal/page-builder-to-markdown";

const para = (text: string) => [
  { _type: "block", style: "normal", children: [{ _type: "span", text }] },
];

test("returns empty string for missing input", () => {
  expect(pageBuilderToMarkdown(undefined)).toBe("");
  expect(pageBuilderToMarkdown(null)).toBe("");
  expect(pageBuilderToMarkdown([])).toBe("");
});

test("serializes an FAQ block as semantic markdown, not a component tag", () => {
  const md = pageBuilderToMarkdown([
    {
      _type: "faqAccordion",
      title: "Questions",
      eyebrow: "FAQ",
      subtitle: "Helpful answers",
      faqs: [
        { _id: "1", title: "What is this?", richText: para("An answer.") },
        { _id: "2", title: "" }, // skipped — no title
      ],
    },
  ]);

  expect(md).toContain("**FAQ**");
  expect(md).toContain("## Questions");
  expect(md).toContain("Helpful answers");
  expect(md).toContain("### What is this?");
  expect(md).toContain("An answer.");
  // The acceptance criterion: no raw <FAQComponent/> style tags.
  expect(md).not.toMatch(/<[A-Za-z]/);
});

test("unknown blocks contribute nothing", () => {
  const md = pageBuilderToMarkdown([
    { _type: "someFutureBlock", title: "Ignore me" } as MarkdownBlock,
    { _type: "richTextBlock", title: "Kept", richText: para("Body.") },
  ]);

  expect(md).not.toContain("Ignore me");
  expect(md).toContain("## Kept");
  expect(md).toContain("Body.");
});

test("separates blocks with a blank line", () => {
  const md = pageBuilderToMarkdown([
    { _type: "richTextBlock", title: "One" },
    { _type: "richTextBlock", title: "Two" },
  ]);

  expect(md).toBe("## One\n\n## Two");
});
