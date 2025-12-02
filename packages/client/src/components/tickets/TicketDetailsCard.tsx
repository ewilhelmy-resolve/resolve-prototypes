import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Ticket priority level
 */
export type TicketPriority = "low" | "medium" | "high" | "critical";

/**
 * Ticket details
 */
export interface TicketDetails {
	id: string;
	title: string;
	description: string;
	priority: TicketPriority;
}

interface TicketDetailsCardProps {
	ticket: TicketDetails;
	className?: string;
}

/**
 * Card component displaying ticket details with priority badge
 *
 * Features:
 * - Ticket ID and title display
 * - Priority badge with color coding
 * - Description section with separator
 * - Responsive layout
 *
 * @component
 */
export default function TicketDetailsCard({
	ticket,
	className,
}: TicketDetailsCardProps) {
	const getPriorityColor = (priority: TicketPriority) => {
		switch (priority) {
			case "critical":
				return "bg-red-50 text-red-800 border-red-400";
			case "high":
				return "bg-orange-50 text-orange-800 border-orange-400";
			case "medium":
				return "bg-yellow-50 text-yellow-800 border-yellow-400";
			case "low":
				return "bg-blue-50 text-blue-800 border-blue-400";
		}
	};

	return (
		<div className={cn("border rounded-lg p-4 flex flex-col gap-2.5", className)}>
			<div className="flex items-center gap-2 w-full">
				<p className="text-base flex-1">{ticket.id}</p>
				<Badge
					className={cn(
						"px-2 py-0.5 border font-semibold",
						getPriorityColor(ticket.priority)
					)}
				>
					{ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
				</Badge>
			</div>

			<p className="text-base">{ticket.title}</p>

			<Separator className="h-[1px]" />

			<div className="flex flex-col gap-2">
				<p className="text-sm text-muted-foreground">Description</p>
				<p className="text-base">{ticket.description}</p>
			</div>
		</div>
	);
}
