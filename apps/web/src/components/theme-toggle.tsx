"use client";

import { cn } from "@workspace/tailwind-config/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// "system" is a real option: once light or dark is picked, it is the only way
// back to following the OS.
const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // `theme` is unknown until next-themes reads localStorage on the client, so
  // the first paint shows "system" — what the server rendered too.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === (mounted ? theme : "system"))
  );

  return (
    <fieldset
      aria-label="Theme"
      className={cn(
        "relative grid grid-cols-3 rounded-full border bg-muted/50 p-0.5",
        className
      )}
    >
      {/* Every option is the same width, so the thumb slides by whole widths. */}
      <span
        aria-hidden="true"
        className="absolute top-0.5 left-0.5 size-7 rounded-full bg-background shadow-sm transition-[translate] duration-200 ease-out motion-reduce:transition-none"
        style={{ translate: `${activeIndex * 100}%` }}
      />
      {OPTIONS.map(({ value, label, Icon }, index) => (
        <button
          aria-pressed={index === activeIndex}
          aria-label={label}
          className={cn(
            "focus-ring relative grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
            index === activeIndex && "text-foreground"
          )}
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          type="button"
        >
          <Icon aria-hidden="true" className="size-3.5" />
        </button>
      ))}
    </fieldset>
  );
}
