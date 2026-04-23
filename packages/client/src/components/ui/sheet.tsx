import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({
  onOpenChange,
  ...props
}: Omit<React.ComponentProps<typeof Dialog.Root>, "onOpenChange"> & {
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Dialog.Root
      data-slot="sheet"
      onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}
      {...props}
    />
  )
}

function SheetTrigger({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Trigger> & {
  asChild?: boolean
}) {
  return (
    <Dialog.Trigger
      data-slot="sheet-trigger"
      {...(asChild && React.isValidElement(children)
        ? { render: children }
        : {})}
      {...props}
    >
      {asChild ? undefined : children}
    </Dialog.Trigger>
  )
}

function SheetClose({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Close> & {
  asChild?: boolean
}) {
  return (
    <Dialog.Close
      data-slot="sheet-close"
      {...(asChild && React.isValidElement(children)
        ? { render: children }
        : {})}
      {...props}
    >
      {asChild ? undefined : children}
    </Dialog.Close>
  )
}

function SheetPortal({
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Portal>) {
  return <Dialog.Portal data-slot="sheet-portal" {...props} />
}

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Dialog.Backdrop>
>(({ className, ...props }, ref) => (
  <Dialog.Backdrop
    ref={ref}
    data-slot="sheet-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/50",
      "transition-opacity duration-300",
      "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

const sidePositionStyles = {
  top: "inset-x-0 top-0 h-auto border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
  bottom:
    "inset-x-0 bottom-0 h-auto border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  right:
    "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
} as const

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Dialog.Popup> & {
    side?: "top" | "right" | "bottom" | "left"
  }
>(({ className, children, side = "right", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Dialog.Popup
      ref={ref}
      data-slot="sheet-content"
      className={cn(
        "bg-background fixed z-50 flex flex-col gap-4 shadow-lg",
        "transition-transform duration-300 ease-in-out",
        sidePositionStyles[side],
        className
      )}
      {...props}
    >
      {children}
      <Dialog.Close
        data-slot="sheet-close"
        className="ring-offset-background focus:ring-ring data-[open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
      >
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </Dialog.Close>
    </Dialog.Popup>
  </SheetPortal>
))
SheetContent.displayName = "SheetContent"

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
