"use client";

import { cn } from "@workspace/tailwind-config/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

const sidebarItemVariants = cva(
  "focus-ring relative flex min-h-9 w-full items-center max-lg:min-h-11 gap-2 px-2 py-1.5 text-left text-base sm:text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  {
    variants: {
      active: {
        true: "bg-sidebar-accent text-sidebar-accent-foreground",
        false: "text-muted-foreground",
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
        "focus-ring flex min-h-9 cursor-pointer list-none max-lg:min-h-11 items-center gap-2 px-2 py-1.5 text-base text-muted-foreground transition-colors marker:hidden sm:text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&::-webkit-details-marker]:hidden",
        className
      )}
      data-slot="sidebar-group-trigger"
      {...props}
    >
      {children}
      <ChevronDown className="ml-auto size-4.5 shrink-0 lg:size-3.5 -rotate-90 opacity-60 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-open/sidebar-group:rotate-0 motion-reduce:transition-none" />
    </summary>
  );
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative py-0.5 before:absolute before:inset-y-0.5 before:left-2.5 before:w-px before:bg-sidebar-border",
        "[&>[data-slot=sidebar-item]]:ml-2.5 [&>[data-slot=sidebar-item]]:w-auto [&>[data-slot=sidebar-item]]:pl-3.5 [&>[data-slot=sidebar-group]>summary]:ml-2.5 [&>[data-slot=sidebar-group]>summary]:pl-3.5 [&>[data-slot=sidebar-group]>[data-slot=sidebar-group-content]]:ml-4",
        "[&>[data-active]]:before:absolute [&>[data-active]]:before:inset-y-1.5 [&>[data-active]]:before:left-0 [&>[data-active]]:before:w-px [&>[data-active]]:before:bg-sidebar-accent-foreground",
        className
      )}
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
