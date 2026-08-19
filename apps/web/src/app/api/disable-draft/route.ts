import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

const DISABLE_DELAY_MS = 1000;

/**
 * Reduces a caller-supplied `slug` to a path on this origin. Anything with a
 * scheme, a protocol-relative `//` prefix, or a backslash is discarded rather
 * than followed, so the route cannot be used as an open redirect.
 */
function toInternalPath(slug: string | null): string {
  if (!slug) {
    return "/";
  }

  const candidate = slug.trim();
  if (
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /^[a-z][a-z\d+\-.]*:/i.test(candidate)
  ) {
    return "/";
  }

  try {
    const { pathname, search, hash } = new URL(candidate, "http://localhost");
    return `${pathname}${search}${hash}`;
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const redirectPath = toInternalPath(request.nextUrl.searchParams.get("slug"));

  (await draftMode()).disable();
  await new Promise((resolve) => setTimeout(resolve, DISABLE_DELAY_MS));
  redirect(redirectPath);
}
