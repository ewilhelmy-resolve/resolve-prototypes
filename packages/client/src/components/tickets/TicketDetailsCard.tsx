import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getPriorityColor, formatPriority } from "@/lib/tickets/utils";

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
	const { t } = useTranslation("tickets");

	return (
		<div className={cn("border rounded-lg p-4 flex flex-col gap-2.5", className)}>
			<div className="flex items-center gap-2 w-full">
				<p className="text-base flex-1">{ticket.id}</p>
				<Badge
					className={cn(
						"px-2 py-0.5 border font-semibold",					getPriorityColor(ticket.priority)
				)}
			>
				{formatPriority(ticket.priority)}
			</Badge>
			</div>

			<p className="text-base">{ticket.title}</p>

			<Separator className="h-[1px]" />

			<div className="flex flex-col gap-2">
				<p className="text-sm text-muted-foreground">{t("details.description")}</p>
				<p className="text-base">{ticket.description}</p>
			</div>
		</div>
	);
}
