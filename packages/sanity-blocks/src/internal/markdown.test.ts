/**
 * The helpers in ./markdown.ts back every per-block serializer, so correctness
 * here protects the entire pipeline.
 */

import { eyebrowToMarkdown, headingToMarkdown, joinSections } from "./markdown";

test("joinSections returns empty string for an empty array", () => {
  expect(joinSections([])).toBe("");
});

test("joinSections filters null, undefined, and whitespace-only entries", () => {
  expect(joinSections([null, undefined, "  ", ""])).toBe("");
});

test("joinSections joins non-empty sections with a blank line", () => {
  expect(joinSections(["A", "B", "C"])).toBe("A\n\nB\n\nC");
});

test("joinSections returns a single non-empty section unchanged", () => {
  expect(joinSections(["only"])).toBe("only");
});

test("joinSections skips whitespace-only entries between real sections", () => {
  expect(joinSections(["First", "   ", "Second"])).toBe("First\n\nSecond");
});

test("eyebrowToMarkdown returns empty for null/undefined/empty/whitespace", () => {
  expect(eyebrowToMarkdown(null)).toBe("");
  expect(eyebrowToMarkdown(undefined)).toBe("");
  expect(eyebrowToMarkdown("")).toBe("");
  expect(eyebrowToMarkdown("   ")).toBe("");
});

test("eyebrowToMarkdown wraps plain text in bold markers", () => {
  expect(eyebrowToMarkdown("New")).toBe("**New**");
});

test("eyebrowToMarkdown escapes # inside bold", () => {
  expect(eyebrowToMarkdown("Say #1")).toBe("**Say \\#1**");
});

test("eyebrowToMarkdown escapes underscores inside bold", () => {
  expect(eyebrowToMarkdown("_italic_")).toBe("**\\_italic\\_**");
});

test("eyebrowToMarkdown escapes square brackets inside bold", () => {
  expect(eyebrowToMarkdown("[link]")).toBe("**\\[link\\]**");
});

test("eyebrowToMarkdown escapes angle brackets (prevents HTML injection)", () => {
  expect(eyebrowToMarkdown("<script>")).toBe("**\\<script\\>**");
});

test("eyebrowToMarkdown escapes backtick and pipe", () => {
  expect(eyebrowToMarkdown("`code` | pipe")).toBe("**\\`code\\` \\| pipe**");
});

test("headingToMarkdown returns empty for null/undefined/whitespace", () => {
  expect(headingToMarkdown(null, 2)).toBe("");
  expect(headingToMarkdown(undefined, 2)).toBe("");
  expect(headingToMarkdown("  ", 2)).toBe("");
});

test("headingToMarkdown emits ## prefix for level 2", () => {
  expect(headingToMarkdown("About Us", 2)).toBe("## About Us");
});

test("headingToMarkdown emits ### prefix for level 3", () => {
  expect(headingToMarkdown("Card Title", 3)).toBe("### Card Title");
});

test("headingToMarkdown escapes underscores in title", () => {
  expect(headingToMarkdown("user_name field", 2)).toBe("## user\\_name field");
});

test("headingToMarkdown escapes square brackets in title", () => {
  expect(headingToMarkdown("[Tag] heading", 2)).toBe("## \\[Tag\\] heading");
});

test("headingToMarkdown escapes leading # so it is not a nested heading", () => {
  expect(headingToMarkdown("#hashtag", 2)).toBe("## \\#hashtag");
});

test("headingToMarkdown escapes asterisks in title", () => {
  expect(headingToMarkdown("*bold* text", 3)).toBe("### \\*bold\\* text");
});

test("headingToMarkdown escapes angle brackets (prevents HTML injection)", () => {
  expect(headingToMarkdown("<script>alert(1)</script>", 2)).toBe(
    "## \\<script\\>alert(1)\\</script\\>"
  );
});
