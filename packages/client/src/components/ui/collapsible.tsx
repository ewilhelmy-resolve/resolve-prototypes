"use client"

import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

import { cn } from "@/lib/utils"

function Collapsible({
  className,
  onOpenChange,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Root>, "onOpenChange"> & {
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cn(className)}
      onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}
      {...props}
    />
  )
}

function CollapsibleTrigger({
  asChild,
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> & {
  asChild?: boolean
}) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(className)}
      {...(asChild && React.isValidElement(children) ? { render: children } : {})}
      {...props}
    >
      {asChild ? undefined : children}
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Panel>) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(className)}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
