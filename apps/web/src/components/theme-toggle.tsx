"use client";

import { cn } from "@workspace/tailwind-config/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** Cycle order. "system" is a real stop, not a hidden default — a two-way
 * light/dark toggle writes `localStorage.theme` on the first click and there
 * is then no way back to following the OS. */
const ORDER = ["light", "dark", "system"] as const;

type ThemeName = (typeof ORDER)[number];

const LABELS: Record<ThemeName, string> = {
  light: "light",
  dark: "dark",
  system: "system",
};

const ICONS: Record<ThemeName, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function isThemeName(value: string | undefined): value is ThemeName {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // `theme` is unknown until next-themes has read localStorage on the client,
  // so the first paint renders the "system" default — which is what the server
  // rendered too. No hydration mismatch, no flash of the wrong icon.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current: ThemeName = mounted && isThemeName(theme) ? theme : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] as ThemeName;
  const Icon = ICONS[current];
  const label = `Theme: ${LABELS[current]}. Switch to ${LABELS[next]}.`;

  return (
    <button
      aria-label={label}
      className={cn(
        "focus-ring grid size-9 shrink-0 place-items-center rounded-md hover:bg-muted",
        className
      )}
      onClick={() => setTheme(next)}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}
