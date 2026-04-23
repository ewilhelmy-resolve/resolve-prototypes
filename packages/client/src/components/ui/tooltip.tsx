import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  children,
  ...props
}: {
  delayDuration?: number
  children: React.ReactNode
}) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delayDuration}
      {...props}
    >
      {children}
    </TooltipPrimitive.Provider>
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> & {
  asChild?: boolean
}) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      {...(asChild && React.isValidElement(children) ? { render: children } : {})}
      {...props}
    >
      {asChild ? undefined : children}
    </TooltipPrimitive.Trigger>
  )
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  side,
  align,
  hidden,
  arrowClassName,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup> & {
  sideOffset?: number
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  hidden?: boolean
  arrowClassName?: string
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        data-slot="tooltip-positioner"
        className="z-50"
        sideOffset={sideOffset}
        side={side}
        align={align}
        positionMethod="fixed"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          hidden={hidden}
          className={cn(
            "bg-foreground text-background z-50 w-fit origin-(--transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
            "transition-[opacity,transform] duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            className={cn(
              "bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]",
              arrowClassName
            )}
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
