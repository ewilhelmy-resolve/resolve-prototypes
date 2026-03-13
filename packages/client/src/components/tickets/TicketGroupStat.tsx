import { BookX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KBStatus } from "@/types/cluster";

export function formatRelativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	const weeks = Math.floor(days / 7);
	return `${weeks}w ago`;
}

interface TicketGroupStatProps {
	/** Unique identifier for the ticket group (UUID) */
	id: string;
	/** The title/category of the ticket group */
	title: string;
	/** The total count of tickets in this group */
	count: number;
	/** Number of tickets needing response */
	openCount: number;
	/** Knowledge base status */
	knowledgeStatus: KBStatus;
	/** Whether a Resolve Action workflow is linked to this cluster */
	hasAction?: boolean;
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
 * Displays cluster name, ticket count, open count, and gap icons.
 */
export function TicketGroupStat({
	id,
	title,
	count,
	_openCount,
	knowledgeStatus,
	_hasAction,
	costImpact,
	mttr,
	onClick,
	newTicketCount,
	updatedAt,
}: TicketGroupStatProps) {
	const navigate = useNavigate();

	const handleClick = () => {
		onClick ? onClick() : navigate(`/tickets/${id}`);
	};

	const hasKnowledgeGap = knowledgeStatus === "GAP";

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
					{(costImpact != null || mttr != null) && (
						<div className="flex items-baseline gap-1.5 text-xs text-muted-foreground">
							{costImpact != null && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span>
											$
											{costImpact >= 1000
												? `${(costImpact / 1000).toFixed(1)}k`
												: Math.round(costImpact).toLocaleString()}
										</span>
									</TooltipTrigger>
									<TooltipContent>Cost Impact</TooltipContent>
								</Tooltip>
							)}
							{costImpact != null && mttr != null && <span>·</span>}
							{mttr != null && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span>{mttr}m</span>
									</TooltipTrigger>
									<TooltipContent>Mean Time to Resolve</TooltipContent>
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
							<TooltipContent>Knowledge Gap</TooltipContent>
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
