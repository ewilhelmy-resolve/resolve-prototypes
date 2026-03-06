import { ChevronLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { TicketDetailHeader } from "@/components/tickets/TicketDetailHeader";
import TicketDetailsCard from "@/components/tickets/TicketDetailsCard";
import { Button } from "@/components/ui/button";
import { useClusterTickets, useTicket } from "@/hooks/useClusters";

export default function TicketDetailPage() {
	const { t } = useTranslation("tickets");
	const { clusterId, ticketId } = useParams<{
		clusterId: string;
		ticketId: string;
	}>();
	const { data: ticket, isLoading, error } = useTicket(ticketId);
	const { data: clusterTicketsData } = useClusterTickets(clusterId, {
		limit: 100,
	});

	// Get ticket IDs from cluster for navigation
	const ticketIds = clusterTicketsData?.data?.map((t) => t.id) ?? [];

	if (isLoading) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex min-h-screen items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</RitaLayout>
		);
	}

	if (error || !ticket) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
					<p className="text-muted-foreground">{t("page.notFound")}</p>
					<Button asChild variant="outline">
						<Link to={clusterId ? `/tickets/${clusterId}` : "/tickets"}>
							<ChevronLeft className="mr-2 h-4 w-4" />
							{t("navigation.backToCluster")}
						</Link>
					</Button>
				</div>
			</RitaLayout>
		);
	}

	// Map API ticket to card format
	const ticketForCard = {
		id: ticket.external_id,
		title: ticket.subject,
		description: ticket.description || "No description available.",
		priority:
			(ticket.priority as "low" | "medium" | "high" | "critical") ?? null,
		requester: ticket.requester,
		status: ticket.external_status,
		assignedTo: ticket.assigned_to,
		createdAt: ticket.created_at,
	};

	return (
		<RitaLayout activePage="tickets">
			<div className="flex flex-col">
				{/* Full-width Header */}
				<TicketDetailHeader
					ticketId={ticket.id}
					externalId={ticket.external_id}
					clusterId={clusterId}
					ticketIds={ticketIds}
				/>

				{/* Content */}
				<div className="flex flex-col gap-4 p-4 w-full max-w-3xl mx-auto">
					{/* Page Header */}
					<h1 className="text-xl font-medium">{ticket.subject}</h1>

					{/* Ticket Details Card */}
					<TicketDetailsCard ticket={ticketForCard} />
				</div>
			</div>
		</RitaLayout>
	);
}
