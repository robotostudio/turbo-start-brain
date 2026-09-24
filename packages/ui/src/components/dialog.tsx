"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@workspace/tailwind-config/utils";
import type * as React from "react";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(
  props: React.ComponentProps<typeof DialogPrimitive.Close>
) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const DialogPortal = DialogPrimitive.Portal;

function DialogBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 min-h-dvh sm:bg-background/80 sm:backdrop-blur-sm",
        "transition-opacity duration-(--duration-fast) ease-(--ease-smooth-out) data-ending-style:duration-(--duration-quick) motion-reduce:transition-none",
        "data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      data-slot="dialog-backdrop"
      {...props}
    />
  );
}

function DialogPopup({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Popup
      className={cn(
        "fixed inset-0 z-50 flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground outline-none",
        "sm:inset-auto sm:top-[15dvh] sm:left-1/2 sm:h-auto sm:w-[calc(100vw-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:border sm:shadow-lg",
        "transition-[translate,scale,opacity] ease-(--ease-smooth-out) motion-reduce:transition-none",
        "duration-(--duration-slow) data-ending-style:duration-(--duration-medium) data-ending-style:translate-y-full data-starting-style:translate-y-full",
        "sm:duration-(--duration-fast) sm:data-ending-style:duration-(--duration-quick) sm:data-ending-style:translate-y-0 sm:data-starting-style:translate-y-0",
        "sm:data-ending-style:scale-96 sm:data-ending-style:opacity-0 sm:data-starting-style:scale-96 sm:data-starting-style:opacity-0",
        className
      )}
      data-slot="dialog-popup"
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-medium text-foreground", className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
