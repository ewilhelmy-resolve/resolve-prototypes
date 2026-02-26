import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
	AUTOMATION_GAP_BADGE_STYLE,
	KB_STATUS_BADGE_STYLES,
} from "@/lib/constants";
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
	/** Whether a Resolve Action workflow is linked to this cluster */
	hasAction?: boolean;
	/** Value score (0-100), shown when sorting by value */
	valueScore?: number;
	/** Optional click handler - overrides default navigation */
	onClick?: () => void;
}

/**
 * TicketGroupStat - Individual ticket group statistics card
 *
 * Displays a ticket category with count, knowledge status badge,
 * and optional value score.
 */
export function TicketGroupStat({
	id,
	title,
	count,
	knowledgeStatus,
	hasAction,
	valueScore,
	onClick,
}: TicketGroupStatProps) {
	const navigate = useNavigate();

	const handleClick = () => {
		onClick ? onClick() : navigate(`/tickets/${id}`);
	};

	const getStatusBadge = () => {
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

			{/* Status Badge + Value Score */}
			<div className="flex items-center justify-between">
				<div className="flex flex-wrap items-center gap-1">
					{getStatusBadge()}
					{hasAction === false && (
						<Badge
							variant={AUTOMATION_GAP_BADGE_STYLE.variant}
							className={AUTOMATION_GAP_BADGE_STYLE.className}
						>
							{AUTOMATION_GAP_BADGE_STYLE.text}
						</Badge>
					)}
				</div>
				{valueScore != null && (
					<span className="text-xs font-medium text-muted-foreground">
						Value: {valueScore}/100
					</span>
				)}
			</div>
		</button>
	);
}
