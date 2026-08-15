"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "mx-overlay-backdrop fixed inset-0 bg-surface-overlay/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef(({ className, children, overlayClassName, showClose = true, size = "md", scrollable = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      data-mx-overlay="dialog"
      data-mx-overlay-layer="modal"
      data-mx-overlay-size={size}
      data-mx-overlay-scroll={scrollable ? "body" : undefined}
      className={cn(
        "mx-overlay-surface fixed left-[var(--mx-overlay-compact-gutter)] right-[var(--mx-overlay-compact-gutter)] top-[50%] flex w-auto translate-y-[-50%] flex-col gap-[var(--mx-overlay-gap)] p-[var(--mx-overlay-padding)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:left-[50%] sm:-translate-x-1/2 sm:right-auto sm:w-full",
        {
          "sm:max-w-[var(--mx-overlay-size-sm)]": size === "sm",
          "sm:max-w-[var(--mx-overlay-size-md)]": size === "md",
          "sm:max-w-[var(--mx-overlay-size-lg)]": size === "lg",
          "sm:max-w-[var(--mx-overlay-size-xl)]": size === "xl",
        }[size],
        scrollable ? "mx-overlay-body" : "overflow-hidden",
        className
      )}
      {...props}>
      {children}
      {showClose && (
        <DialogPrimitive.Close
          aria-label="Fechar diálogo"
          className="mx-overlay-close absolute right-[var(--mx-overlay-compact-gutter)] top-[var(--mx-overlay-compact-gutter)] rounded-[var(--mx-overlay-close-radius)] opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogBody = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-mx-overlay-body="true"
    className={cn("mx-overlay-body", className)}
    {...props} />
))
DialogBody.displayName = "DialogBody"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-h4", className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-body-sm text-muted-foreground", className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
