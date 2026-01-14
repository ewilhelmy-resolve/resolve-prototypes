import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AlertVariant = "warning" | "info" | "success" | "error";

const variantStyles: Record<
	AlertVariant,
	{ container: string; iconBg: string; iconColor: string; button: string }
> = {
	warning: {
		container: "border-yellow-300 bg-yellow-50",
		iconBg: "bg-yellow-200",
		iconColor: "text-yellow-600",
		button: "border-yellow-400 bg-yellow-100 hover:bg-yellow-200",
	},
	info: {
		container: "border-blue-300 bg-blue-50",
		iconBg: "bg-blue-200",
		iconColor: "text-blue-600",
		button: "border-blue-400 bg-blue-100 hover:bg-blue-200",
	},
	success: {
		container: "border-green-300 bg-green-50",
		iconBg: "bg-green-200",
		iconColor: "text-green-600",
		button: "border-green-400 bg-green-100 hover:bg-green-200",
	},
	error: {
		container: "border-red-300 bg-red-50",
		iconBg: "bg-red-200",
		iconColor: "text-red-600",
		button: "border-red-400 bg-red-100 hover:bg-red-200",
	},
};

interface RecommendationAlertProps {
	/** Alert title */
	title: string;
	/** Alert description */
	description: string;
	/** Icon to display */
	icon: LucideIcon;
	/** Button label */
	buttonLabel: string;
	/** Callback when button is clicked */
	onButtonClick: () => void;
	/** Color variant */
	variant?: AlertVariant;
	/** Optional className for the container */
	className?: string;
}

/**
 * RecommendationAlert - Configurable alert card for recommendations
 *
 * Displays:
 * - Icon in colored badge
 * - Title and description
 * - Action button
 *
 * Supports variants: warning, info, success, error
 *
 * @component
 */
export function RecommendationAlert({
	title,
	description,
	icon: Icon,
	buttonLabel,
	onButtonClick,
	variant = "warning",
	className,
}: RecommendationAlertProps) {
	const styles = variantStyles[variant];

	return (
		<div
			className={cn(
				"rounded-lg border p-4",
				styles.container,
				className
			)}
		>
			<div className="flex flex-col gap-3">
				<span className={cn("p-2 w-fit rounded-md", styles.iconBg)}>
					<Icon className={cn("h-5 w-5", styles.iconColor)} />
				</span>
				<div className="flex flex-col gap-1">
					<h4 className="font-semibold">{title}</h4>
					<p className="text-sm">{description}</p>
				</div>
				<Button
					variant="outline"
					className={cn("w-full", styles.button)}
					onClick={onButtonClick}
				>
					{buttonLabel}
				</Button>
			</div>
		</div>
	);
}
