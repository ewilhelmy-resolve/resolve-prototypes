import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface TicketGroupStatProps {
	/** Unique identifier for the ticket group */
	id: string;
	/** The title/category of the ticket group */
	title: string;
	/** The total count of tickets in this group */
	count: number;
	/** Percentage of manually handled tickets (0-100) */
	manualPercentage: number;
	/** Percentage of automated tickets (0-100) */
	automatedPercentage: number;
	/** Knowledge base status: whether knowledge was found or there's a gap */
	knowledgeStatus: "found" | "gap";
}

/**
 * TicketGroupStat - Individual ticket group statistics card
 *
 * Displays a ticket category with count, manual/automated breakdown,
 * progress visualization, and knowledge status indicator. Clickable to navigate to detail page.
 *
 * @param id - The unique identifier for the ticket group
 * @param title - The category name (e.g., "Billing Issues", "Technical Support")
 * @param count - Total number of tickets in this group
 * @param manualPercentage - Percentage of manually handled tickets
 * @param automatedPercentage - Percentage of automated tickets
 * @param knowledgeStatus - Whether knowledge was found or there's a gap
 *
 * @example
 * ```tsx
 * <TicketGroupStat
 *   id="billing-issues"
 *   title="Billing Issues"
 *   count={1234}
 *   manualPercentage={65}
 *   automatedPercentage={35}
 *   knowledgeStatus="found"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <TicketGroupStat
 *   id="account-access"
 *   title="Account Access"
 *   count={856}
 *   manualPercentage={90}
 *   automatedPercentage={10}
 *   knowledgeStatus="gap"
 * />
 * ```
 */
export function TicketGroupStat({
	id,
	title,
	count,
	manualPercentage,
	automatedPercentage,
	knowledgeStatus,
}: TicketGroupStatProps) {
	const navigate = useNavigate();

	const handleClick = () => {
		navigate(`/tickets/${id}`);
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

			{/* Progress Bar and Legend */}
			<div className="flex flex-col gap-2">
				<Progress value={manualPercentage} className="h-2" />
				<div className="flex justify-between">
					<div className="flex items-center gap-1">
						<div className="size-1.5 rounded-sm bg-primary" />
						<span className="text-xs text-muted-foreground">Manual</span>
						<span className="text-xs text-foreground">{manualPercentage}%</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="size-1.5 rounded-sm bg-primary" />
						<span className="text-xs text-muted-foreground">Automated</span>
						<span className="text-xs text-foreground">
							{automatedPercentage}%
						</span>
					</div>
				</div>
			</div>

			{/* Knowledge Status Badge */}
			<div>
				<Badge
					variant={knowledgeStatus === "found" ? "secondary" : "secondary"}
					className={cn(
						knowledgeStatus === "gap" &&
							"bg-yellow-50 text-secondary-foreground border-yellow-500",
					)}
				>
					{knowledgeStatus === "found" ? "Knowledge found" : "Knowledge gap"}
				</Badge>
			</div>
		</button>
	);
}
