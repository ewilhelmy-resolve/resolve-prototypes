import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getKnowledgeStatusBadge } from "@/lib/cluster-utils";
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
	automatedPercentage = 0,
	onClick,
}: TicketGroupStatProps) {
	const navigate = useNavigate();

	const handleClick = () => {
		onClick ? onClick() : navigate(`/tickets/${id}`);
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
				<Progress
					value={automatedPercentage}
					indicatorClassName="bg-rita-teal"
				/>
				<div className="text-xs text-muted-foreground">
					<span>{automatedPercentage}% Automate</span>
				</div>
			</div>

			{/* Knowledge Status Badge */}
			<div>
				{(() => {
					const style = getKnowledgeStatusBadge(knowledgeStatus);
					return style ? (
						<Badge variant={style.variant} className={style.className}>
							{style.text}
						</Badge>
					) : null;
				})()}
			</div>
		</button>
	);
}
