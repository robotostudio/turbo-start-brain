import { isPortableTextTextBlock, type StringOptions } from "sanity";

const isRelativeUrl = (url: string) =>
  url.startsWith("/") || url.startsWith("#") || url.startsWith("?");

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export const isValidUrl = (url: string) => {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol);
  } catch (_e) {
    return isRelativeUrl(url);
  }
};

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const getTitleCase = (name: string) => {
  const titleTemp = name.replace(/([A-Z])/g, " $1");
  return titleTemp.charAt(0).toUpperCase() + titleTemp.slice(1);
};

export const createRadioListLayout = (
  items: Array<string | { title: string; value: string }>,
  options?: StringOptions
): StringOptions => {
  const list = items.map((item) => {
    if (typeof item === "string") {
      return {
        title: getTitleCase(item),
        value: item,
      };
    }
    return item;
  });
  return {
    layout: "radio",
    list,
    ...options,
  };
};

export const parseRichTextToString = (
  value: unknown,
  maxWords: number | undefined
) => {
  if (!Array.isArray(value)) {
    return "No Content";
  }

  const text = value.map((val) => {
    const test = isPortableTextTextBlock(val);
    if (!test) {
      return "";
    }
    return val.children
      .map((child) => child.text)
      .filter(Boolean)
      .join(" ");
  });
  if (maxWords) {
    return `${text.join(" ").split(" ").slice(0, maxWords).join(" ")}...`;
  }
  return text.join(" ");
};

/**
 * Determines the presentation URL based on the current environment.
 * In development, uses SANITY_STUDIO_PRESENTATION_URL when set, else falls back
 * to localhost:3000.
 * In production, requires SANITY_STUDIO_PRESENTATION_URL to be set.
 * @throws {Error} If SANITY_STUDIO_PRESENTATION_URL is not set in production
 */
export const getPresentationUrl = () => {
  const presentationUrl = process.env.SANITY_STUDIO_PRESENTATION_URL;
  if (process.env.NODE_ENV === "development") {
    return presentationUrl || "http://localhost:3000";
  }

  if (!presentationUrl) {
    throw new Error(
      "SANITY_STUDIO_PRESENTATION_URL must be set in production environment"
    );
  }

  return presentationUrl;
};
