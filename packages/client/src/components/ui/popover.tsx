import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

function Popover({
  modal,
  onOpenChange,
  ...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive.Root>, "onOpenChange"> & {
  modal?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <PopoverPrimitive.Root
      data-slot="popover"
      modal={modal}
      onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}
      {...props}
    />
  )
}

function PopoverTrigger({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> & {
  asChild?: boolean
}) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      {...(asChild && React.isValidElement(children) ? { render: children } : {})}
      {...props}
    >
      {asChild ? undefined : children}
    </PopoverPrimitive.Trigger>
  )
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  side,
  children,
  onEscapeKeyDown,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Popup> & {
  align?: "start" | "center" | "end"
  sideOffset?: number
  side?: "top" | "bottom" | "left" | "right"
  onEscapeKeyDown?: (event?: KeyboardEvent) => void
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        align={align}
        sideOffset={sideOffset}
        side={side}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "bg-popover text-popover-foreground z-50 w-72 origin-(--transform-origin) rounded-md border p-4 shadow-md outline-hidden",
            "transition-[opacity,transform] duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  children?: React.ReactNode
}) {
  return <div data-slot="popover-anchor" {...props}>{children}</div>
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
