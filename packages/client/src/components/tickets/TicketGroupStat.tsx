import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { KB_STATUS_BADGE_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
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
	/** Manual handling percentage (hardcoded for now) */
	manualPercentage?: number;
	/** Automated handling percentage (hardcoded for now) */
	automatedPercentage?: number;
	/** Optional click handler - overrides default navigation */
	onClick?: () => void;
}

/**
 * TicketGroupStat - Individual ticket group statistics card
 *
 * Displays a ticket category with count and knowledge status indicator.
 * Clickable to navigate to detail page.
 */
export function TicketGroupStat({
	id,
	title,
	count,
	knowledgeStatus,
	manualPercentage = 100,
	automatedPercentage = 0,
	onClick,
}: TicketGroupStatProps) {
	const navigate = useNavigate();

	const handleClick = () => {
		onClick ? onClick() : navigate(`/tickets/${id}`);
	};

	const getKnowledgeBadge = () => {
		const style = KB_STATUS_BADGE_STYLES[knowledgeStatus];
		if (!style) return null;
		return (
			<Badge variant={style.variant} className={style.className}>
				{style.text}
			</Badge>
		);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-accent/50 transition-colors text-left"
		>
			{/* Title and Count */}
			<div className="flex flex-col gap-3.5">
				<h2 className="text-base font-normal text-card-foreground leading-7">
					{title}
				</h2>
				<div className="text-[38px] font-normal leading-6 text-card-foreground">
					{count}
				</div>
			</div>

			{/* Progress Bar */}
			<div className="flex flex-col gap-2">
				<div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
					<div
						className={cn("h-full bg-primary")}
						style={{ width: `${manualPercentage}%` }}
					/>
					<div
						className={cn("h-full bg-green-500")}
						style={{ width: `${automatedPercentage}%` }}
					/>
				</div>
				<div className="flex justify-between text-xs text-muted-foreground">
					<span>{manualPercentage}% Manual</span>
					<span>{automatedPercentage}% Automated</span>
				</div>
			</div>

			{/* Knowledge Status Badge */}
			<div>
				{getKnowledgeBadge()}
			</div>
		</button>
	);
}
