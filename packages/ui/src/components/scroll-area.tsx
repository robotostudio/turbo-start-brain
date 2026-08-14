import { cn } from "@workspace/tailwind-config/utils";
import type * as React from "react";

function ScrollArea({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-y-auto overscroll-contain [scrollbar-gutter:stable]",
        className
      )}
      data-slot="scroll-area"
      {...props}
    />
  );
}

export { ScrollArea };
