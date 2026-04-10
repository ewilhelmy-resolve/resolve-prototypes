import { BookX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { formatRelativeTime } from "@/lib/date-utils";
import { formatMoneySaved } from "@/lib/format-utils";
import type { KBStatus } from "@/types/cluster";

interface TicketGroupStatProps {
	/** Unique identifier for the ticket group (UUID) */
	id: string;
	/** The title/category of the ticket group */
	title: string;
	/** The total count of tickets in this group */
	count: number;
	/** Knowledge base status */
	knowledgeStatus: KBStatus;
	/** Estimated monthly cost impact */
	costImpact?: number;
	/** Mean time to resolve in minutes */
	mttr?: number;
	/** Optional click handler - overrides default navigation */
	onClick?: () => void;
	/** Number of new tickets since last check */
	newTicketCount?: number;
	/** ISO date string of last update */
	updatedAt?: string;
}

/**
 * TicketGroupStat - Cluster card
 *
 * Displays cluster name, ticket count, cost/MTTR metrics, and gap icons.
 */
export function TicketGroupStat({
	id,
	title,
	count,
	knowledgeStatus,
	costImpact,
	mttr,
	onClick,
	newTicketCount,
	updatedAt,
}: TicketGroupStatProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();
	const enableAdvancedFeatures = useFeatureFlag(
		"ENABLE_CLUSTER_ADVANCED_FEATURES",
	);

	const handleClick = () => {
		onClick ? onClick() : navigate(`/tickets/${id}`);
	};

	const hasKnowledgeGap = enableAdvancedFeatures && knowledgeStatus === "GAP";
	const showMttr = enableAdvancedFeatures && mttr != null;

	return (
		<button
			type="button"
			onClick={handleClick}
			className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-accent/50 transition-colors text-left"
		>
			<h2 className="text-base font-normal text-card-foreground leading-7">
				{title}
			</h2>
			<div className="flex items-end justify-between">
				<div className="flex items-baseline gap-2">
					<span className="text-[38px] font-normal leading-6 text-card-foreground">
						{count.toLocaleString()}
					</span>
					{(costImpact != null || showMttr) && (
						<div className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
							{costImpact != null && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span>{formatMoneySaved(costImpact)}</span>
									</TooltipTrigger>
									<TooltipContent>
										{t("prioritizationList.columns.costImpact")}
									</TooltipContent>
								</Tooltip>
							)}
							{costImpact != null && showMttr && <span>·</span>}
							{showMttr && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span>{mttr}m</span>
									</TooltipTrigger>
									<TooltipContent>
										{t("prioritizationList.columns.mttr")}
									</TooltipContent>
								</Tooltip>
							)}
						</div>
					)}
				</div>
				{hasKnowledgeGap && (
					<div className="flex items-center gap-1.5">
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
									<BookX className="h-3.5 w-3.5 text-yellow-600" />
								</span>
							</TooltipTrigger>
							<TooltipContent>{t("gaps.knowledgeGap")}</TooltipContent>
						</Tooltip>
					</div>
				)}
			</div>
			{(newTicketCount != null && newTicketCount > 0) || updatedAt ? (
				<div className="border-t border-border pt-3 mt-auto text-xs text-muted-foreground">
					{newTicketCount != null && newTicketCount > 0 && updatedAt
						? `${newTicketCount} new ticket${newTicketCount === 1 ? "" : "s"} \u00b7 ${formatRelativeTime(updatedAt)}`
						: newTicketCount != null && newTicketCount > 0
							? `${newTicketCount} new ticket${newTicketCount === 1 ? "" : "s"}`
							: updatedAt
								? `Updated ${formatRelativeTime(updatedAt)}`
								: null}
				</div>
			) : null}
		</button>
	);
}
