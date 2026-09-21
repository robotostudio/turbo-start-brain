"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableColorScheme
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}
