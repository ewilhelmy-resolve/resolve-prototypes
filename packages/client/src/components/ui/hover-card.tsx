import * as React from "react"
import { PreviewCard } from "@base-ui/react/preview-card"

import { cn } from "@/lib/utils"

type HoverCardDelays = {
  openDelay?: number
  closeDelay?: number
}

const HoverCardDelayContext = React.createContext<HoverCardDelays>({})

function HoverCard({
  openDelay,
  closeDelay,
  ...props
}: React.ComponentProps<typeof PreviewCard.Root> & HoverCardDelays) {
  const delays = React.useMemo(
    () => ({ openDelay, closeDelay }),
    [openDelay, closeDelay]
  )
  return (
    <HoverCardDelayContext.Provider value={delays}>
      <PreviewCard.Root data-slot="hover-card" {...props} />
    </HoverCardDelayContext.Provider>
  )
}

function HoverCardTrigger({
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof PreviewCard.Trigger> & {
  asChild?: boolean
}) {
  const { openDelay, closeDelay } = React.useContext(HoverCardDelayContext)
  return (
    <PreviewCard.Trigger
      data-slot="hover-card-trigger"
      delay={openDelay}
      closeDelay={closeDelay}
      {...(asChild && React.isValidElement(children) ? { render: children } : {})}
      {...props}
    >
      {asChild ? undefined : children}
    </PreviewCard.Trigger>
  )
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  side,
  ...props
}: React.ComponentPropsWithoutRef<typeof PreviewCard.Popup> & {
  align?: "start" | "center" | "end"
  sideOffset?: number
  side?: "top" | "bottom" | "left" | "right"
}) {
  return (
    <PreviewCard.Portal data-slot="hover-card-portal">
      <PreviewCard.Positioner
        data-slot="hover-card-positioner"
        align={align}
        sideOffset={sideOffset}
        side={side}
      >
        <PreviewCard.Popup
          data-slot="hover-card-content"
          className={cn(
            "bg-popover text-popover-foreground z-50 w-64 origin-(--transform-origin) rounded-md border p-4 shadow-md outline-hidden",
            "transition-[opacity,transform] duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className
          )}
          {...props}
        />
      </PreviewCard.Positioner>
    </PreviewCard.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
