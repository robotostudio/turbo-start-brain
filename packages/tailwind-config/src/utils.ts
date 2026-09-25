import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register the `--text-*` scale, or tailwind-merge drops `text-micro` as a colour.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "hero",
        "display",
        "h1",
        "h2",
        "h3",
        "h4",
        "lede",
        "body",
        "small",
        "micro",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
