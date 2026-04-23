import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

function Dialog({
  onOpenChange,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Root>, "onOpenChange"> & {
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}
      {...props}
    />
  )
}

function DialogTrigger({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> & {
  asChild?: boolean
}) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...(asChild && React.isValidElement(children)
        ? { render: children }
        : {})}
      {...props}
    >
      {asChild ? undefined : children}
    </DialogPrimitive.Trigger>
  )
}

function DialogPortal({
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> & {
  asChild?: boolean
}) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      {...(asChild && React.isValidElement(children)
        ? { render: children }
        : {})}
      {...props}
    >
      {asChild ? undefined : children}
    </DialogPrimitive.Close>
  )
}

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Backdrop
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/50",
      "transition-opacity duration-200",
      "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup> & {
    showCloseButton?: boolean
  }
>(({ className, children, showCloseButton = true, ...props }, ref) => {
  const { t } = useTranslation("common")
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={ref}
        data-slot="dialog-content"
        className={cn(
          "bg-background fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[calc(100%-2rem)] grid gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg",
          "transition-[opacity,transform] duration-200",
          "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
          "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[open]:bg-accent data-[open]:text-muted-foreground absolute top-6 right-6 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">{t("accessibility.close")}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
})
DialogContent.displayName = "DialogContent"

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
