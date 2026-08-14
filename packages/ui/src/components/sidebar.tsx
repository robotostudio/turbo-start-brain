"use client";

import { cn } from "@workspace/tailwind-config/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronRight } from "lucide-react";
import type * as React from "react";

const sidebarItemVariants = cva(
  "focus-ring flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  {
    variants: {
      active: {
        true: "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        false: "text-sidebar-foreground/75",
      },
    },
    defaultVariants: { active: false },
  }
);

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground [--color-border:var(--sidebar-border)]",
        className
      )}
      data-slot="sidebar"
      {...props}
    />
  );
}

function SidebarGroup({
  className,
  open = true,
  ...props
}: React.ComponentProps<"details">) {
  return (
    <details
      className={cn("group/sidebar-group", className)}
      data-slot="sidebar-group"
      open={open}
      {...props}
    />
  );
}

function SidebarGroupTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<"summary">) {
  return (
    <summary
      className={cn(
        "focus-ring flex min-h-8 list-none items-center gap-2 rounded-md px-2 py-1.5 font-medium text-sm marker:hidden hover:bg-sidebar-accent [&::-webkit-details-marker]:hidden",
        className
      )}
      data-slot="sidebar-group-trigger"
      {...props}
    >
      <ChevronRight className="size-3.5 shrink-0 transition-transform group-open/sidebar-group:rotate-90" />
      {children}
    </summary>
  );
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("ml-3 border-sidebar-border border-l pl-2", className)}
      data-slot="sidebar-group-content"
      {...props}
    />
  );
}

function SidebarItem({
  active,
  className,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof sidebarItemVariants>) {
  return (
    <div
      className={cn(sidebarItemVariants({ active }), className)}
      data-active={active || undefined}
      data-slot="sidebar-item"
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupTrigger,
  SidebarItem,
  sidebarItemVariants,
};
