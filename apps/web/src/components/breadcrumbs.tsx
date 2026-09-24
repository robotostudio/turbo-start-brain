import { JsonLdScript } from "@/components/json-ld";
import { getBaseUrl } from "@/utils";

type Crumb = {
  readonly label?: string | null;
  readonly href?: string;
};

/** Turns a slug segment into a human label: `pd-blowers` -> `Pd Blowers`. */
function humanizeSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Ancestor crumbs for a nested slug, excluding the page itself. */
export function ancestorCrumbs(segments: readonly string[]): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
  let path = "";
  for (const segment of segments.slice(0, -1)) {
    path += `/${segment}`;
    crumbs.push({ label: humanizeSegment(segment), href: path });
  }
  return crumbs;
}

/**
 * `BreadcrumbList` for the trail, shared by visible breadcrumbs and metadata.
 */
export function BreadcrumbsJsonLd({
  crumbs,
}: Readonly<{ crumbs: readonly Crumb[] }>) {
  const trail = crumbs.filter((crumb) => Boolean(crumb.label));

  if (trail.length < 2) {
    return null;
  }

  const baseUrl = getBaseUrl();

  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.label,
          ...(crumb.href ? { item: `${baseUrl}${crumb.href}` } : {}),
        })),
      }}
      id="breadcrumb-json-ld"
    />
  );
}
