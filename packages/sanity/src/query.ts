import { faqAccordionGroqProjection } from "@workspace/sanity-blocks/faq-accordion/faq-accordion.groq";
import { featureCardsIconGroqProjection } from "@workspace/sanity-blocks/feature-cards-icon/feature-cards-icon.groq";
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

const portableTextFragment = /* groq */ `
  ${nestedPortableTextFragment},
  _type == "callout" => {
    ...,
    body[]{${nestedPortableTextFragment}}
  },
  _type == "steps" => {
    ...,
    items[]{
      ...,
      content[]{${nestedPortableTextFragment}}
    }
  },
  _type == "tabs" => {
    ...,
    items[]{
      ...,
      content[]{${nestedPortableTextFragment}}
    }
  }
`;

const buttonsFragment = /* groq */ `
  buttons[]{
    text,
    variant,
    _key,
    _type,
    "openInNewTab": url.openInNewTab,
    "href": select(
      url.type == "internal" => url.internal->slug.current,
      url.type == "external" => url.external,
      url.href
    ),
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
    ${featureCardsIconGroqProjection},
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

export const querySearchDocs = defineQuery(`
  *[_type == "doc" && defined(slug.current) && hidden != true]{
    _id,
    title,
    description,
    "slug": slug.current,
    "content": pt::text(body)
  }
`);

export const queryNavbarData = defineQuery(`
  *[_type == "navbar" && _id == "navbar"][0]{
    _id,
    columns[]{
      _key,
      _type == "navbarColumn" => {
        "type": "column",
        title,
        links[]{
          _key,
          name,
          icon,
          description,
          "openInNewTab": url.openInNewTab,
          "href": select(
            url.type == "internal" => url.internal->slug.current,
            url.type == "external" => url.external,
            url.href
          )
        }
      },
      _type == "navbarLink" => {
        "type": "link",
        name,
        description,
        "openInNewTab": url.openInNewTab,
        "href": select(
          url.type == "internal" => url.internal->slug.current,
          url.type == "external" => url.external,
          url.href
        )
      }
    },
    ${buttonsFragment},
    gitHubUrl,
  }
`);

// `seoNoIndex` is excluded here as well as in the page metadata — advertising a
// URL in the sitemap while its own robots tag says noindex is a contradiction
// search engines report as an error.
export const querySitemapData = defineQuery(`{
  "docs": *[_type == "doc" && defined(slug.current) && seoNoIndex != true]{
    "slug": slug.current,
    "lastModified": _updatedAt
  }
}`);
export const queryGlobalSeoSettings = defineQuery(`
  *[_type == "settings"][0]{
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
  *[_type == "settings"][0]{
    _id,
    _type,
    siteTitle,
    siteDescription,
    "logo": logos.logo.asset->url + "?w=80&h=40&dpr=3&fit=max",
    "socialLinks": socialLinks,
    "contactEmail": contactEmail,
  }
`);

export const queryRedirects = defineQuery(`
  *[_type == "redirect" && status == "active" && defined(source.current) && defined(destination.current)]{
    "source":source.current, 
    "destination":destination.current, 
    "permanent" : permanent == "true"
  }
`);
