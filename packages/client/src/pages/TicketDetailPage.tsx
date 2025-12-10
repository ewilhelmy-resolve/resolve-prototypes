import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Button } from "@/components/ui/button";
import TicketDetailsCard from "@/components/tickets/TicketDetailsCard";
import { TicketDetailHeader } from "@/components/tickets/TicketDetailHeader";
import ReviewAIResponseSheet from "@/components/tickets/ReviewAIResponseSheet";
import type { TicketPriority } from "@/components/tickets/TicketDetailsCard";

// Mock ticket data - TODO: Replace with API call
const MOCK_TICKETS: Record<string, {
	id: string;
	title: string;
	description: string;
	priority: TicketPriority;
}> = {
	"INC0000001": {
		id: "INC0000001",
		title: "Password Reset",
		description: "User unable to access account. Password reset required.",
		priority: "high",
	},
	"INC0000002": {
		id: "INC0000002",
		title: "VPN Connection Troubleshooting",
		description: "VPN client fails to connect. Error code 800.",
		priority: "medium",
	},
	"INC0000003": {
		id: "INC0000003",
		title: "Two-factor authentication setup",
		description: "User needs help configuring 2FA for their account.",
		priority: "low",
	},
	"INC0000004": {
		id: "INC0000004",
		title: "Phishing awareness guide",
		description: "Request for phishing email identification training.",
		priority: "low",
	},
	"INC0000005": {
		id: "INC0000005",
		title: "Email Configuration Setup",
		description: "New employee needs email client configuration assistance.",
		priority: "medium",
	},
};

const TICKET_IDS = Object.keys(MOCK_TICKETS);

export default function TicketDetailPage() {
	const { clusterId, ticketId } = useParams<{ clusterId: string; ticketId: string }>();
	const ticket = ticketId ? MOCK_TICKETS[ticketId] : undefined;
	const [reviewSheetOpen, setReviewSheetOpen] = useState(false);

	if (!ticket) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
					<p className="text-muted-foreground">Ticket not found</p>
					<Button asChild variant="outline">
						<Link to={clusterId ? `/tickets/${clusterId}` : "/tickets"}>
							<ChevronLeft className="mr-2 h-4 w-4" />
							Back to cluster
						</Link>
					</Button>
				</div>
			</RitaLayout>
		);
	}

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
					clusterId={clusterId}
					ticketIds={TICKET_IDS}
					onReviewAIResponse={() => setReviewSheetOpen(true)}
				/>

				{/* Content */}
				<div className="flex flex-col gap-4 p-4 w-full max-w-3xl mx-auto">
					{/* Page Header */}
					<h1 className="text-xl font-medium">{ticket.title}</h1>

					{/* Ticket Details Card */}
					<TicketDetailsCard ticket={ticket} />
				</div>

				{/* Review AI Response Sheet */}
				<ReviewAIResponseSheet
					open={reviewSheetOpen}
					onOpenChange={setReviewSheetOpen}
					ticketGroupId={clusterId}
					tickets={[{
						id: ticket.id,
						title: ticket.title,
						description: ticket.description,
						priority: ticket.priority,
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
