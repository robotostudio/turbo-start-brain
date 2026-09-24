import { JsonLdScript } from "@/components/json-ld";
import type { DocsTreeNode } from "@/lib/docs-tree";
import { getBaseUrl } from "@/utils";

type Crumb = {
  readonly label?: string | null;
  readonly href?: string;
};

/**
 * Ancestor crumbs for a nested slug, excluding the page itself, labelled with
 * each section's title from the docs tree (the same names as the sidebar).
 */
export function ancestorCrumbs(
  segments: readonly string[],
  tree: readonly DocsTreeNode[]
): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Home", href: "" }];
  let nodes = tree;
  let path = "";
  for (const segment of segments.slice(0, -1)) {
    path += `/${segment}`;
    const node = nodes.find((candidate) => candidate.slug === path);
    crumbs.push({ label: node?.title ?? segment, href: path });
    nodes = node?.children ?? [];
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
          ...(crumb.href === undefined
            ? {}
            : { item: `${baseUrl}${crumb.href}` }),
        })),
      }}
      id="breadcrumb-json-ld"
    />
  );
}
