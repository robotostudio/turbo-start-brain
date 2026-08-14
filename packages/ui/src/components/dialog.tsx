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
        "fixed inset-0 z-50 min-h-dvh bg-background/80 backdrop-blur-sm",
        "transition-opacity duration-200 ease-out motion-reduce:transition-none",
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
        "fixed top-[15dvh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2",
        "flex flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-lg outline-none",
        "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        "data-ending-style:scale-95 data-ending-style:opacity-0",
        "data-starting-style:scale-95 data-starting-style:opacity-0",
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
