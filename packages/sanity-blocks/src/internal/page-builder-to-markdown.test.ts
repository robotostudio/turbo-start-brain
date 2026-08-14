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
      categories: [
        {
          _key: "cat-1",
          title: "General",
          faqs: [
            { _id: "1", title: "What is this?", richText: para("An answer.") },
            { _id: "2", title: "" }, // skipped — no title
          ],
        },
      ],
      link: { title: "More", description: "See all", href: "/faq" },
    },
  ]);

  expect(md).toContain("**FAQ**");
  expect(md).toContain("## Questions");
  expect(md).toContain("Helpful answers");
  expect(md).toContain("### What is this?");
  expect(md).toContain("An answer.");
  expect(md).toContain("[See all](/faq)");
  // The acceptance criterion: no raw <FAQComponent/> style tags.
  expect(md).not.toMatch(/<[A-Za-z]/);
});

test("serializes feature cards as nested headings", () => {
  const md = pageBuilderToMarkdown([
    {
      _type: "featureCardsIcon",
      title: "Features",
      cards: [
        {
          _key: "c1",
          title: "Fast",
          richText: para("Very fast."),
          icon: "bolt",
        },
      ],
    },
  ]);

  expect(md).toContain("## Features");
  expect(md).toContain("### Fast");
  expect(md).toContain("Very fast.");
  expect(md).not.toContain("bolt");
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

test("treats '#' href as no link (plain text fallback)", () => {
  const faq = pageBuilderToMarkdown([
    {
      _type: "faqAccordion",
      title: "Q",
      categories: [
        {
          _key: "cat-1",
          title: "General",
          faqs: [{ _id: "1", title: "x", richText: para("y") }],
        },
      ],
      link: { title: "More", href: "#" },
    },
  ]);
  expect(faq).toContain("More");
  expect(faq).not.toContain("(#)");
});

test("keeps no-href links as plain text instead of dropping them", () => {
  const faq = pageBuilderToMarkdown([
    {
      _type: "faqAccordion",
      title: "Q",
      categories: [
        {
          _key: "cat-1",
          title: "General",
          faqs: [{ _id: "1", title: "x", richText: para("y") }],
        },
      ],
      link: { title: "All questions" },
    },
  ]);
  expect(faq).toContain("All questions");
  expect(faq).not.toContain("](");
});

test("separates blocks with a blank line", () => {
  const md = pageBuilderToMarkdown([
    { _type: "richTextBlock", title: "One" },
    { _type: "richTextBlock", title: "Two" },
  ]);

  expect(md).toBe("## One\n\n## Two");
});
