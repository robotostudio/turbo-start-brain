import { type DynamicFetchOptions, sanityFetch } from "@workspace/sanity/live";
import { queryDocsTree } from "@workspace/sanity/query";

type DocsTreeDocument = {
  _id: string;
  title: string;
  description?: string | null;
  slug: string;
  order?: number | null;
  icon?: string | null;
  hidden?: boolean | null;
};

export type DocsTreeNode = {
  title: string;
  slug: string;
  order: number;
  icon?: string | null;
  description?: string | null;
  document?: DocsTreeDocument;
  children: DocsTreeNode[];
};

function humanize(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function compareNodes(a: DocsTreeNode, b: DocsTreeNode): number {
  return a.order - b.order || a.title.localeCompare(b.title);
}

function buildDocsTree(
  documents: readonly DocsTreeDocument[] | null | undefined
): DocsTreeNode[] {
  const roots: DocsTreeNode[] = [];

  for (const document of documents ?? []) {
    if (document.hidden || !document.slug) {
      continue;
    }

    const segments = document.slug.split("/").filter(Boolean);
    let siblings = roots;
    let path = "";

    for (const [index, segment] of segments.entries()) {
      path += `/${segment}`;
      let node = siblings.find((item) => item.slug === path);
      if (!node) {
        node = {
          title: humanize(segment),
          slug: path,
          order: Number.POSITIVE_INFINITY,
          children: [],
        };
        siblings.push(node);
      }

      if (index === segments.length - 1) {
        node.title = document.title || node.title;
        node.order = document.order ?? 0;
        node.icon = document.icon;
        node.description = document.description;
        node.document = document;
      }

      siblings = node.children;
    }
  }

  const sort = (nodes: DocsTreeNode[]) => {
    nodes.sort(compareNodes);
    for (const node of nodes) {
      sort(node.children);
    }
  };
  sort(roots);
  return roots;
}

export function flattenDocsTree(tree: readonly DocsTreeNode[]): DocsTreeNode[] {
  return tree.flatMap((node) => [
    ...(node.document ? [node] : []),
    ...flattenDocsTree(node.children),
  ]);
}

export async function getDocsNavigation({
  perspective,
  stega,
}: DynamicFetchOptions): Promise<DocsTreeNode[]> {
  "use cache";
  const { data } = await sanityFetch({
    query: queryDocsTree,
    perspective,
    stega,
  });
  return buildDocsTree(data as DocsTreeDocument[] | null);
}
