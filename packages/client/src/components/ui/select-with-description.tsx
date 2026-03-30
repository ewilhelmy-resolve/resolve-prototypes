import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * SelectItemWithDescription - A select option with a title and description
 * Extends the base Base UI Select.Item with visual description support
 */
function SelectItemWithDescription({
	className,
	children,
	description,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
	description?: string
}) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item-with-description"
			className={cn(
				"relative flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm py-2 pl-2 pr-8 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				className
			)}
			{...props}
		>
			<div className="flex flex-col gap-0.5">
				<SelectPrimitive.ItemText>
					<span className="font-medium">{children}</span>
				</SelectPrimitive.ItemText>
				{description && (
					<span className="text-xs text-muted-foreground">{description}</span>
				)}
			</div>

			<span className="flex h-3.5 w-3.5 items-center justify-center flex-shrink-0">
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="h-5 w-5 font-semibold" />
				</SelectPrimitive.ItemIndicator>
			</span>
		</SelectPrimitive.Item>
	)
}

export { SelectItemWithDescription }
