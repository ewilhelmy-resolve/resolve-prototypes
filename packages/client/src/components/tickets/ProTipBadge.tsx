import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProTipBadgeProps {
	/** The tip text to display (without "Pro-tip:" prefix) */
	children: React.ReactNode;
	/** Optional className for the container */
	className?: string;
}

/**
 * ProTipBadge - A badge component for displaying pro tips
 *
 * Displays a lightbulb icon followed by "Pro-tip:" label and the tip text
 * in a rounded pill-shaped container with a light blue background.
 *
 * @component
 * @example
 * <ProTipBadge>Continued review helps confirm patterns across more tickets.</ProTipBadge>
 */
export function ProTipBadge({ children, className }: ProTipBadgeProps) {
	const { t } = useTranslation("tickets");

	return (
		<div
			className={cn(
				"inline-flex items-start gap-2 px-4 py-2 bg-blue-50 rounded-2xl max-w-full",
				className,
			)}
		>
			<Lightbulb className="size-4 text-blue-500 flex-shrink-0 mt-0.5" />
			<span className="text-sm text-foreground">
				<span className="font-bold">{t("proTip.prefix")}</span> {children}
			</span>
		</div>
	);
}
