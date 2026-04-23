import { useTranslation } from "react-i18next";
import {
	calculateEstMoneySaved,
	calculateEstTimeSavedMinutes,
	formatMoneySaved,
} from "@/lib/format-utils";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";

interface AutomationMetricsCardProps {
	/** Number of automated tickets */
	automated?: number;
	/** Optional className for the container */
	className?: string;
}

/**
 * AutomationMetricsCard - Displays key automation metrics
 *
 * Shows a 3-column grid with:
 * - Automated ticket count
 * - Minutes saved (automated × avgTimePerTicket from settings)
 * - Cost savings (automated × costPerTicket from settings)
 *
 * @component
 */
export function AutomationMetricsCard({
	automated = 0,
	className,
}: AutomationMetricsCardProps) {
	const { t } = useTranslation("tickets");
	const { blendedRatePerHour, avgMinutesPerTicket } = useTicketSettingsStore();

	const minsSaved = calculateEstTimeSavedMinutes(
		avgMinutesPerTicket,
		automated,
	);
	const savings = calculateEstMoneySaved(
		blendedRatePerHour,
		avgMinutesPerTicket,
		automated,
	);

	return (
		<div className={className}>
			<div className="rounded-lg border p-3">
				<div className="grid grid-cols-3 gap-8 text-center">
					<div>
						<div className="text-2xl font-medium">{automated}</div>
						<div className="text-xs text-muted-foreground">
							{t("metrics.automated")}
						</div>
					</div>
					<div>
						<div className="text-2xl font-medium">{minsSaved}</div>
						<div className="text-xs text-muted-foreground">
							{t("metrics.minsSaved")}
						</div>
					</div>
					<div>
						<div className="text-2xl font-medium">
							{formatMoneySaved(savings)}
						</div>
						<div className="text-xs text-muted-foreground">
							{t("metrics.savings")}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
