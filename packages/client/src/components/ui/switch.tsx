import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

interface SwitchProps
	extends Omit<
		React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
		"onCheckedChange"
	> {
	onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<
	React.ElementRef<typeof SwitchPrimitive.Root>,
	SwitchProps
>(({ className, onCheckedChange, ...props }, ref) => (
	<SwitchPrimitive.Root
		className={cn(
			"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[unchecked]:bg-input",
			className,
		)}
		onCheckedChange={
			onCheckedChange
				? (checked, _event) => onCheckedChange(checked)
				: undefined
		}
		{...props}
		ref={ref}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				"pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[checked]:translate-x-4 data-[unchecked]:translate-x-0",
			)}
		/>
	</SwitchPrimitive.Root>
))
Switch.displayName = "Switch"

export { Switch }
