import { HeartCrack, PartyPopper, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type BannerVariant = "success" | "destructive" | "enriched";

interface FeedbackBannerProps {
	/** Banner variant determines color scheme */
	variant?: BannerVariant;
	/** Main title text */
	title: string;
	/** Optional description text */
	description?: string;
	/** Whether to show dismiss button */
	dismissible?: boolean;
	/** Called when dismiss button is clicked */
	onDismiss?: () => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * FeedbackBanner - Banner for action feedback states
 *
 * Variants:
 * - success: Green theme with PartyPopper icon for positive outcomes
 * - destructive: Red theme with HeartCrack icon for negative outcomes
 * - enriched: Purple gradient with PartyPopper for auto-populate/enrichment
 */
export function FeedbackBanner({
	variant = "success",
	title,
	description,
	dismissible = true,
	onDismiss,
	className,
}: FeedbackBannerProps) {
	const { t } = useTranslation("common");
	const variantStyles = {
		success: {
			container: "bg-green-50 border-y border-green-300",
			iconBg: "bg-green-200",
			iconColor: "text-green-600",
		},
		destructive: {
			container: "bg-red-50 border-y border-red-300",
			iconBg: "bg-red-200",
			iconColor: "text-red-600",
		},
		enriched: {
			container: "border-y border-[#3d8bff]",
			iconBg: "",
			iconColor: "",
		},
	}[variant];

	const isEnriched = variant === "enriched";
	const Icon = variant === "destructive" ? HeartCrack : PartyPopper;

	return (
		<div
			className={cn(
				"flex items-start px-8 py-3 shadow-sm",
				variantStyles.container,
				className
			)}
			style={
				isEnriched
					? {
							backgroundImage:
								"linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%), linear-gradient(90deg, rgba(61, 139, 255, 1) 0%, rgba(87, 34, 246, 1) 48.8%, rgba(151, 71, 255, 1) 97.6%)",
						}
					: undefined
			}
		>
			<div className="flex flex-1 flex-col gap-0.5">
				{/* Title row with icon */}
				<div className="flex items-center gap-2.5">
					<div
						className={cn(
							"flex items-center justify-center rounded-lg size-6",
							!isEnriched && variantStyles.iconBg
						)}
					>
						<Icon
							className={cn(
								"size-4",
								isEnriched ? "text-violet-600" : variantStyles.iconColor
							)}
						/>
					</div>
					<span className="text-base font-medium text-foreground">
						{title}
					</span>
				</div>

				{/* Description below */}
				{description && (
					<span className="text-base text-foreground pl-[34px]">
						{description}
					</span>
				)}
			</div>

			{/* Dismiss button */}
			{dismissible && (
				<button
					onClick={onDismiss}
					className="flex items-center justify-center size-9 rounded-md hover:bg-black/5 transition-colors"
					aria-label={t("accessibility.dismissBanner")}
				>
					<X className="size-4 text-foreground" />
				</button>
			)}
		</div>
	);
}

export default FeedbackBanner;
