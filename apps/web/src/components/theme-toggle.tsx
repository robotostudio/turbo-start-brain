"use client";

import { cn } from "@workspace/tailwind-config/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

function switchWithoutFade(apply: () => void) {
  const style = document.createElement("style");
  style.textContent =
    "*:not([data-theme-thumb]),*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  apply();
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      // Force the new colours to resolve before transitions come back.
      window.getComputedStyle(document.body).color;
      style.remove();
    })
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [picked, setPicked] = useState(false);

  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === (mounted ? theme : "system"))
  );

  return (
    <fieldset
      aria-label="Theme"
      className={cn("relative grid shrink-0 grid-cols-3", className)}
    >
      <span
        aria-hidden="true"
        data-theme-thumb=""
        className={cn(
          "absolute inset-y-0 left-0 w-1/3 bg-foreground/10",
          picked &&
            "transition-[translate] duration-(--duration-fast) ease-(--ease-smooth-out) motion-reduce:transition-none"
        )}
        style={{ translate: `${activeIndex * 100}%` }}
      />
      {OPTIONS.map(({ value, label, Icon }, index) => (
        <button
          aria-pressed={index === activeIndex}
          aria-label={label}
          className={cn(
            "focus-ring-inset relative grid min-h-9 min-w-9 place-items-center text-muted-foreground transition-colors hover:text-foreground",
            index === activeIndex && "text-foreground"
          )}
          key={value}
          onClick={() => {
            setPicked(true);
            switchWithoutFade(() => setTheme(value));
          }}
          title={label}
          type="button"
        >
          <Icon aria-hidden="true" className="size-3.5" />
        </button>
      ))}
    </fieldset>
  );
}
