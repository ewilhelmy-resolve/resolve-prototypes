import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Button } from "@/components/ui/button";
import TicketDetailsCard from "@/components/tickets/TicketDetailsCard";
import { TicketDetailHeader } from "@/components/tickets/TicketDetailHeader";
import ReviewAIResponseSheet from "@/components/tickets/ReviewAIResponseSheet";
import type { TicketPriority } from "@/components/tickets/TicketDetailsCard";
import { useTicket, useClusterTickets } from "@/hooks/useClusters";

// Extract priority from source_metadata or default to medium
const getPriorityFromMetadata = (metadata: Record<string, unknown>): TicketPriority => {
	const priority = metadata?.priority as string | undefined;
	if (priority && ["low", "medium", "high", "critical"].includes(priority)) {
		return priority as TicketPriority;
	}
	return "medium";
};

export default function TicketDetailPage() {
	const { t } = useTranslation("tickets");
	const { clusterId, ticketId } = useParams<{ clusterId: string; ticketId: string }>();
	const { data: ticket, isLoading, error } = useTicket(ticketId);
	const { data: clusterTicketsData } = useClusterTickets(clusterId, { limit: 100 });
	const [reviewSheetOpen, setReviewSheetOpen] = useState(false);

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
		description: ticket.cluster_text || "No description available.",
		priority: getPriorityFromMetadata(ticket.source_metadata),
	};

	const handleApprove = (id: string) => {
		console.log(`Approved AI response for ticket: ${id}`);
		// TODO: Implement API call
	};

	const handleReject = (id: string) => {
		console.log(`Rejected AI response for ticket: ${id}`);
		// TODO: Implement API call
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
					onReviewAIResponse={() => setReviewSheetOpen(true)}
				/>

				{/* Content */}
				<div className="flex flex-col gap-4 p-4 w-full max-w-3xl mx-auto">
					{/* Page Header */}
					<h1 className="text-xl font-medium">{ticket.subject}</h1>

					{/* Ticket Details Card */}
					<TicketDetailsCard ticket={ticketForCard} />
				</div>

				{/* Review AI Response Sheet */}
				<ReviewAIResponseSheet
					open={reviewSheetOpen}
					onOpenChange={setReviewSheetOpen}
					ticketGroupId={clusterId}
					tickets={[{
						id: ticket.id,
						externalId: ticket.external_id,
						title: ticket.subject,
						description: ticket.cluster_text || "No description available.",
						priority: ticketForCard.priority,
					}]}
					currentIndex={0}
					onNavigate={() => {}}
					onApprove={handleApprove}
					onReject={handleReject}
				/>
			</div>
		</RitaLayout>
	);
}
