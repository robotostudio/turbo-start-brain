import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The type scale in globals.css (`--text-*`). Unregistered, tailwind-merge
// reads `text-micro` as a colour and drops it next to `text-muted-foreground`.
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
