import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import Link from "next/link";
import { Fragment } from "react";

import {
  ancestorCrumbs,
  BreadcrumbsJsonLd,
  type Crumb,
} from "@/components/breadcrumbs";

export function DocsBreadcrumbs({
  slug,
  title,
}: Readonly<{ slug: string[]; title?: string | null }>) {
  const crumbs: Crumb[] = [
    ...ancestorCrumbs(slug),
    { label: title ?? "Untitled" },
  ];

  return (
    <>
      <BreadcrumbsJsonLd crumbs={crumbs} />
      <Breadcrumb className="mb-8">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const current = index === crumbs.length - 1;
            return (
              <Fragment key={crumb.href ?? crumb.label}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem>
                  {current || !crumb.href ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <Link
                      className="rounded-sm hover:text-foreground focus-ring"
                      href={crumb.href}
                    >
                      {crumb.label}
                    </Link>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
