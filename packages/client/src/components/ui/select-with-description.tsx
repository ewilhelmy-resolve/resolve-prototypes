import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * SelectItemWithDescription - A select option with a title and description
 * Extends the base Radix Select.Item with visual description support
 */
const SelectItemWithDescription = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    description?: string
  }
>(({ className, children, description, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm py-2 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <div className="flex flex-col gap-0.5">
      <SelectPrimitive.ItemText asChild>
        <span className="font-medium">{children}</span>
      </SelectPrimitive.ItemText>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </div>

    <span className="flex h-3.5 w-3.5 items-center justify-center flex-shrink-0">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-5 w-5 font-semibold" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
))
SelectItemWithDescription.displayName = "SelectItemWithDescription"

export { SelectItemWithDescription }
