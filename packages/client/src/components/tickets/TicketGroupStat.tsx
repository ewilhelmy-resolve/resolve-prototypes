import { BookX, ZapOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KBStatus } from "@/types/cluster";

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
	/** Optional click handler - overrides default navigation */
	onClick?: () => void;
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
	openCount,
	knowledgeStatus,
	hasAction,
	onClick,
}: TicketGroupStatProps) {
	const navigate = useNavigate();

	const handleClick = () => {
		onClick ? onClick() : navigate(`/tickets/${id}`);
	};

	const hasKnowledgeGap = knowledgeStatus === "GAP";
	const hasAutomationGap = hasAction === false;

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
					{openCount > 0 && (
						<span className="text-xs text-muted-foreground">{openCount} open</span>
					)}
				</div>
				{(hasKnowledgeGap || hasAutomationGap) && (
					<div className="flex items-center gap-1.5">
						{hasKnowledgeGap && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
										<BookX className="h-3.5 w-3.5 text-yellow-600" />
									</span>
								</TooltipTrigger>
								<TooltipContent>Knowledge Gap</TooltipContent>
							</Tooltip>
						)}
						{hasAutomationGap && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
										<ZapOff className="h-3.5 w-3.5 text-blue-500" />
									</span>
								</TooltipTrigger>
								<TooltipContent>Automation Gap</TooltipContent>
							</Tooltip>
						)}
					</div>
				)}
			</div>
		</button>
	);
}
