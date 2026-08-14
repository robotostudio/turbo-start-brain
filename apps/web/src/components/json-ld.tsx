import type { QuerySettingsDataResult } from "@workspace/sanity/types";
import { stegaClean } from "next-sanity";
import type {
  ContactPoint,
  ImageObject,
  Organization,
  WebSite,
  WithContext,
} from "schema-dts";

import { getJsonLdSettings } from "@/lib/json-ld-data";
import { getBaseUrl } from "@/utils";

// Escape <, >, & to \uXXXX so a "</script>" in any CMS field can't break out of
// the tag. JSON-LD is parsed as data (not executed), so escaping < is what
// matters; the result stays valid JSON for crawlers.
function serializeJsonLd<T>(data: T): string {
  return JSON.stringify(data)
    .replaceAll("<", String.raw`\u003c`)
    .replaceAll(">", String.raw`\u003e`)
    .replaceAll("&", String.raw`\u0026`);
}

export function JsonLdScript<T>({ data, id }: { data: T; id: string }) {
  return (
    <script
      // Raw injection is required so the JSON-LD reaches crawlers unescaped;
      // serializeJsonLd already escapes <, >, & to prevent script breakout.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
      id={id}
      type="application/ld+json"
    />
  );
}

type OrganizationJsonLdProps = {
  settings: QuerySettingsDataResult;
};

function OrganizationJsonLd({ settings }: Readonly<OrganizationJsonLdProps>) {
  if (!settings) {
    return null;
  }

  const baseUrl = getBaseUrl();

  const socialLinks = settings.socialLinks
    ? (Object.values(settings.socialLinks).filter(Boolean) as string[])
    : undefined;

  const organizationJsonLd: WithContext<Organization> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteTitle,
    description: settings.siteDescription || undefined,
    url: baseUrl,
    logo: settings.logo
      ? ({
          "@type": "ImageObject",
          url: settings.logo,
        } as ImageObject)
      : undefined,
    contactPoint: settings.contactEmail
      ? ({
          "@type": "ContactPoint",
          email: settings.contactEmail,
          contactType: "customer service",
        } as ContactPoint)
      : undefined,
    sameAs: socialLinks?.length ? socialLinks : undefined,
  };

  return <JsonLdScript data={organizationJsonLd} id="organization-json-ld" />;
}

type WebSiteJsonLdProps = {
  settings: QuerySettingsDataResult;
};

function WebSiteJsonLd({ settings }: Readonly<WebSiteJsonLdProps>) {
  if (!settings) {
    return null;
  }

  const baseUrl = getBaseUrl();

  const websiteJsonLd: WithContext<WebSite> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteTitle,
    description: settings.siteDescription || undefined,
    url: baseUrl,
    publisher: {
      "@type": "Organization",
      name: settings.siteTitle,
    } as Organization,
  };

  return <JsonLdScript data={websiteJsonLd} id="website-json-ld" />;
}

type CombinedJsonLdProps = {
  settings?: QuerySettingsDataResult;
  includeWebsite?: boolean;
  includeOrganization?: boolean;
};

export async function CombinedJsonLd({
  includeWebsite = false,
  includeOrganization = false,
}: CombinedJsonLdProps) {
  const res = await getJsonLdSettings();

  const cleanSettings = stegaClean(res);
  return (
    <>
      {includeWebsite && cleanSettings && (
        <WebSiteJsonLd settings={cleanSettings} />
      )}
      {includeOrganization && cleanSettings && (
        <OrganizationJsonLd settings={cleanSettings} />
      )}
    </>
  );
}
