"use client";

import { Button } from "@workspace/ui/components/button";
import { SearchIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { openDocsSearch } from "@/components/docs/docs-search";

/**
 * Rescue action for the 404: opens the existing ⌘K palette, seeded with the
 * last segment of the path the visitor asked for.
 */
export function SearchDocsButton({
  className,
}: Readonly<{ className?: string }>) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const seed = decodeURIComponent(segment).replaceAll("-", " ").trim();

  return (
    <Button
      className={className}
      onClick={() => openDocsSearch(seed)}
      size="sm"
      type="button"
      variant="outline"
    >
      <SearchIcon aria-hidden="true" />
      {seed ? `Search for “${seed}”` : "Search the docs"}
    </Button>
  );
}
