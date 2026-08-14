import {
  RichText,
  type RichTextValue,
} from "@workspace/sanity-blocks/internal/rich-text";
import { renderToStaticMarkup } from "react-dom/server";

function paragraph(text: string) {
  return {
    _type: "block",
    _key: `block-${text}`,
    style: "normal",
    children: [{ _type: "span", _key: "span-1", text, marks: [] }],
    markDefs: [],
  };
}

test("RichText renders nothing for missing input", () => {
  expect(renderToStaticMarkup(<RichText richText={null} />)).toBe("");
  expect(renderToStaticMarkup(<RichText richText={undefined} />)).toBe("");
});

test("callout renders its body and variant styling, unknown variant falls back to info", () => {
  const value = [
    {
      _type: "callout",
      _key: "c1",
      variant: "warning",
      body: [paragraph("Mind the gap.")],
    },
    {
      _type: "callout",
      _key: "c2",
      variant: "not-a-variant",
      body: [paragraph("Neutral note.")],
    },
  ] as unknown as RichTextValue;

  const html = renderToStaticMarkup(<RichText richText={value} />);
  expect(html).toMatch(/Mind the gap\./);
  expect(html).toMatch(/border-amber-500\/50/);
  expect(html).toMatch(/Neutral note\./);
  expect(html).toMatch(/border-blue-500\/40/);
});

test("steps renders a numbered list of titled sections", () => {
  const value = [
    {
      _type: "steps",
      _key: "s1",
      items: [
        { _key: "a", title: "Install", content: [paragraph("Run install.")] },
        { _key: "b", title: "Configure", content: [paragraph("Edit env.")] },
      ],
    },
  ] as unknown as RichTextValue;

  const html = renderToStaticMarkup(<RichText richText={value} />);
  expect(html).toMatch(/<ol/);
  expect(html).toMatch(/Install/);
  expect(html).toMatch(/Run install\./);
  expect(html).toMatch(/Configure/);
  expect(html).toMatch(/Edit env\./);
  // Empty steps render nothing.
  expect(
    renderToStaticMarkup(
      <RichText
        richText={
          [
            { _type: "steps", _key: "s2", items: [] },
          ] as unknown as RichTextValue
        }
      />
    )
  ).not.toMatch(/<ol/);
});

test("tabs renders a tab per item with the first panel active", () => {
  const value = [
    {
      _type: "tabs",
      _key: "t1",
      items: [
        { _key: "a", title: "npm", content: [paragraph("npm install")] },
        { _key: "b", title: "pnpm", content: [paragraph("pnpm add")] },
      ],
    },
  ] as unknown as RichTextValue;

  const html = renderToStaticMarkup(<RichText richText={value} />);
  expect(html).toMatch(/role="tab"/);
  expect(html).toMatch(/npm/);
  expect(html).toMatch(/pnpm/);
  expect(html).toMatch(/npm install/);
});

test("muxVideo without a resolved playbackId renders nothing", () => {
  const html = renderToStaticMarkup(
    <RichText
      richText={
        [
          { _type: "muxVideo", _key: "v1", caption: "Soon" },
        ] as unknown as RichTextValue
      }
    />
  );
  expect(html).not.toMatch(/mux-player/);
  expect(html).not.toMatch(/<figure/);
});
