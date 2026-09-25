import { faqAccordionGroqProjection } from "@workspace/sanity-blocks/faq-accordion/faq-accordion.groq";
import { richTextBlockGroqProjection } from "@workspace/sanity-blocks/rich-text-block/rich-text-block.groq";
import { defineQuery } from "next-sanity";

const imageFields = /* groq */ `
  "id": asset._ref,
  "preview": asset->metadata.lqip,
  "alt": coalesce(
    alt,
    asset->altText,
    caption,
    asset->originalFilename,
    "untitled"
  ),
  hotspot {
    x,
    y
  },
  crop {
    bottom,
    left,
    right,
    top
  }
`;
const customLinkFragment = /* groq */ `
  ...customLink{
    openInNewTab,
    "href": select(
      type == "internal" => internal->slug.current,
      type == "external" => external,
      "#"
    )
  }
`;

const nestedPortableTextFragment = /* groq */ `
  ...,
  _type == "block" => {
    ...,
    markDefs[]{
      ...,
      ${customLinkFragment}
    }
  },
  _type == "image" => {
    ${imageFields},
    caption
  },
  _type == "muxVideo" => {
    ...,
    "playbackId": video.asset->playbackId,
    "assetId": video.asset->assetId
  }
`;

const calloutFragment = /* groq */ `
  _type == "callout" => {
    ...,
    body[]{${nestedPortableTextFragment}}
  }
`;

const portableTextFragment = /* groq */ `
  ${nestedPortableTextFragment},
  ${calloutFragment},
  _type == "steps" => {
    ...,
    items[]{
      ...,
      content[]{${nestedPortableTextFragment}, ${calloutFragment}}
    }
  },
  _type == "tabs" => {
    ...,
    items[]{
      ...,
      content[]{${nestedPortableTextFragment}, ${calloutFragment}}
    }
  }
`;

// Page builder block fragments are owned by their respective block packages
// in @workspace/sanity-blocks, imported above, so the GROQ projection and
// the component that reads it stay in lockstep.
const pageBuilderFragment = /* groq */ `
  pageBuilder[]{
    ...,
    _type,
    ${faqAccordionGroqProjection},
    ${richTextBlockGroqProjection}
  }
`;

export const queryDocsIndex =
  defineQuery(`*[_type == "docsIndex" && _id == "docsIndex"][0]{
    ...,
    _id,
    _type,
    title,
    description,
    intro[]{${portableTextFragment}},
    featuredLinks[]->{
      _id,
      title,
      description,
      icon,
      "slug": slug.current
    },
    ogTitle,
    "ogImage": seoImage.asset->url + "?w=1200&h=630&dpr=2&fit=max",
    ${pageBuilderFragment}
  }`);

export const queryDocBySlug = defineQuery(`
  *[_type == "doc" && defined(slug.current) && slug.current == $slug][0]{
    ...,
    "slug": slug.current,
    ogTitle,
    "ogImage": seoImage.asset->url + "?w=1200&h=630&dpr=2&fit=max",
    body[]{${portableTextFragment}},
    ${pageBuilderFragment}
  }
  `);

// Title only: the chat page index needs one string, and `queryDocsIndex`
// drags the whole page builder and portable text along to get it.
export const queryDocsIndexTitle = defineQuery(`
  *[_type == "docsIndex" && _id == "docsIndex"][0]{title}
`);

export const queryDocPaths = defineQuery(`
  *[_type == "doc" && defined(slug.current)].slug.current
`);

export const queryDocsTree = defineQuery(`
  *[_type == "doc" && defined(slug.current)]{
    _id,
    title,
    description,
    "slug": slug.current,
    order,
    icon,
    hidden
  }
`);

export const queryFeaturedDocs = defineQuery(`
  *[_type == "docsIndex" && _id == "docsIndex"][0].featuredLinks[]->{
    title,
    "slug": slug.current
  }
`);

export const querySearchDocs = defineQuery(`
  *[_type == "doc" && defined(slug.current) && hidden != true]{
    _id,
    title,
    description,
    "slug": slug.current,
    // pt::text only reads top-level blocks; callouts, steps and tabs nest theirs.
    "content": array::join([
      coalesce(pt::text(body), ""),
      coalesce(pt::text(body[_type == "callout"].body[]), ""),
      coalesce(array::join(body[_type in ["steps", "tabs"]].items[].title, " "), ""),
      coalesce(pt::text(body[_type in ["steps", "tabs"]].items[].content[]), ""),
      coalesce(pt::text(body[_type in ["steps", "tabs"]].items[].content[_type == "callout"].body[]), "")
    ], " ")
  }
`);

// `seoNoIndex` is excluded here as well as in the page metadata — advertising a
// URL in the sitemap while its own robots tag says noindex is a contradiction
// search engines report as an error.
export const querySitemapData = defineQuery(`{
  "homeModified": *[_type == "docsIndex" && _id == "docsIndex"][0]._updatedAt,
  "docs": *[_type == "doc" && defined(slug.current) && seoNoIndex != true]{
    "slug": slug.current,
    title,
    "lastModified": _updatedAt
  }
}`);
export const queryGlobalSeoSettings = defineQuery(`
  *[_type == "settings" && _id == "settings"][0]{
    _id,
    _type,
    siteTitle,
    logos {
      logo {
        ${imageFields}
      },
      logoDark {
        ${imageFields}
      },
    },
    "ogImage": ogImage.asset->url + "?w=1200&h=630&dpr=2&fit=max",
    "favicon": logos.favicon.asset->url,
    siteDescription,
    socialLinks{
      linkedin,
      facebook,
      twitter,
      instagram,
      youtube,
      reddit
    }
  }
`);

export const querySettingsData = defineQuery(`
  *[_type == "settings" && _id == "settings"][0]{
    _id,
    _type,
    siteTitle,
    siteDescription,
    "logo": logos.logo.asset->url + "?w=80&h=40&dpr=3&fit=max",
    "socialLinks": socialLinks,
    "contactEmail": contactEmail,
  }
`);

export const queryChatSettings = defineQuery(`{
  "siteTitle": *[_type == "settings" && _id == "settings"][0].siteTitle,
  "chat": *[_type == "chat" && _id == "chat"][0]{
    label,
    heading,
    intro,
    placeholder,
    suggestedQuestions,
    instructions
  }
}`);

export const queryRedirects = defineQuery(`
  *[_type == "redirect" && status == "active" && defined(source.current) && defined(destination.current)]{
    "source":source.current, 
    "destination":destination.current, 
    "permanent" : permanent == "true"
  }
`);
