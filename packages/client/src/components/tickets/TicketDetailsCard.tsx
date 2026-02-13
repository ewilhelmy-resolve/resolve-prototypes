import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPriority, getPriorityColor } from "@/lib/tickets/utils";
import { cn } from "@/lib/utils";

/**
 * Ticket priority level
 */
export type TicketPriority = "low" | "medium" | "high" | "critical" | null;

/**
 * Ticket details
 */
export interface TicketDetails {
	id: string;
	title: string;
	description: string;
	priority: TicketPriority;
	requester: string | null;
	status: string;
	assignedTo: string | null;
	createdAt: string;
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
 * - Requester, status, assigned to, created metadata grid
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
		<div className={cn("border rounded-lg p-4 flex flex-col gap-3", className)}>
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2 w-full">
					<p className="text-base flex-1">{ticket.id}</p>
					<Badge
						className={cn(
							"px-2 py-0.5 border font-semibold",
							getPriorityColor(ticket.priority),
						)}
					>
						{formatPriority(ticket.priority)}
					</Badge>
				</div>

				<p className="text-base">{ticket.title}</p>
			</div>

			<Separator className="h-[1px]" />

			<div className="flex flex-col gap-2">
				<div className="flex gap-2">
					<div className="flex flex-col flex-1">
						<p className="text-sm text-muted-foreground">
							{t("details.requester")}
						</p>
						<p className="text-base">{ticket.requester || "--"}</p>
					</div>
					<div className="flex flex-col flex-1">
						<p className="text-sm text-muted-foreground">
							{t("details.status")}
						</p>
						<p className="text-base">{ticket.status}</p>
					</div>
				</div>
				<div className="flex gap-2">
					<div className="flex flex-col flex-1">
						<p className="text-sm text-muted-foreground">
							{t("details.assignedTo")}
						</p>
						<p className="text-base">{ticket.assignedTo || "--"}</p>
					</div>
					<div className="flex flex-col flex-1">
						<p className="text-sm text-muted-foreground">
							{t("details.created")}
						</p>
						<p className="text-base">
							{new Date(ticket.createdAt).toLocaleString()}
						</p>
					</div>
				</div>
			</div>

			<Separator className="h-[1px]" />

			<div className="flex flex-col gap-2">
				<p className="text-sm text-muted-foreground">
					{t("details.description")}
				</p>
				<p className="text-base">{ticket.description}</p>
			</div>
		</div>
	);
}
