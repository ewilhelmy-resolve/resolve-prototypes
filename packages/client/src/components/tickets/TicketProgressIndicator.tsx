import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";

interface TicketProgressIndicatorProps {
	currentIndex: number;
	total: number;
	className?: string;
}

/**
 * Progress indicator for multi-ticket navigation
 *
 * Features:
 * - Current position display (e.g., "1 of 2")
 * - Visual progress bar
 * - Responsive layout
 *
 * @component
 */
export default function TicketProgressIndicator({
	currentIndex,
	total,
	className,
}: TicketProgressIndicatorProps) {
	const { t } = useTranslation("tickets");
	const progressValue = ((currentIndex + 1) / total) * 100;

	return (
		<div className={className}>
			<div className="flex items-center gap-3 w-full">
				<div className="flex items-center gap-1.5 shrink-0">
					<p className="text-base text-accent-foreground">{t("details.ticketsCount")}</p>
					<p className="text-base font-bold text-accent-foreground">
						{currentIndex + 1} of {total}
					</p>
				</div>
				<Progress value={progressValue} className="flex-1 h-2" />
			</div>
		</div>
	);
}
