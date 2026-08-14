import { env } from "@workspace/env/client";

export const getBaseUrl = () => {
  if (env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  }

  if (env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
    return env.NEXT_PUBLIC_VERCEL_URL;
  }

  return "http://localhost:3000";
};

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Placeholder slug returned from `generateStaticParams` when no real paths
 * exist yet, so the dynamic route still prerenders a shell.
 */
export const PLACEHOLDER_SLUG = "__placeholder__";

/**
 * Formats an ISO date string as `Mon D, YYYY` (en-US). Returns `null` for
 * missing or unparseable values so callers can skip rendering.
 */
export function formatDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Response<T> = [T, undefined] | [undefined, string];

export async function handleErrors<T>(
  promise: Promise<T>
): Promise<Response<T>> {
  try {
    const data = await promise;
    return [data, undefined];
  } catch (err) {
    return [
      undefined,
      err instanceof Error ? err.message : JSON.stringify(err),
    ];
  }
}
