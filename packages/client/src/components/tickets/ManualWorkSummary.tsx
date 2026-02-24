import { useTranslation } from "react-i18next";
import type { AggregateSavings } from "@/lib/tickets/prioritization";

interface ManualWorkSummaryProps {
	savings: AggregateSavings;
}

export function ManualWorkSummary({ savings }: ManualWorkSummaryProps) {
	const { t } = useTranslation("tickets");

	if (savings.totalCount === 0) return null;

	return (
		<div className="rounded-lg border bg-background p-4">
			<h2 className="text-base font-semibold">
				{t("manualWork.summaryTitle")}
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				{savings.totalNeedsResponse === 0
					? t("manualWork.noManualWork")
					: t("manualWork.summaryDescriptionSimple", {
							tickets: savings.totalNeedsResponse.toLocaleString(),
						})}
			</p>
			<p className="mt-0.5 text-sm text-muted-foreground">
				{t("manualWork.knowledgeCount", {
					found: savings.knowledgeFoundCount,
					total: savings.totalCount,
				})}
			</p>
		</div>
	);
}
