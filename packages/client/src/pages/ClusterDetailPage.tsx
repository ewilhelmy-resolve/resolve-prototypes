import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClusterDetailSidebar } from "@/components/tickets/ClusterDetailSidebar";
import { TicketTrendsChart } from "@/components/tickets/TicketTrendsChart";
import { ClusterDetailTable } from "@/components/tickets/ClusterDetailTable";
import { getTicketGroup } from "@/lib/tickets/utils";

export default function ClusterDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const ticketGroup = id ? getTicketGroup(id) : undefined;

	const handleBack = () => {
		navigate("/tickets");
	};

	// Use ticket group data or fallback
	const title = ticketGroup?.title ?? (id
		? id
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ")
		: "Cluster");

	const badges = [
		{ text: `${ticketGroup?.count ?? 0} tickets`, variant: "secondary" as const },
		{ text: `${ticketGroup?.openCount ?? 0} open`, variant: "secondary" as const },
		{ text: `${ticketGroup?.automatedPercentage ?? 0}% automated`, variant: "secondary" as const },
		{ text: ticketGroup?.knowledgeStatus === "found" ? "Knowledge found" : "Knowledge gap", variant: "outline" as const },
	];

	return (
		<RitaLayout activePage="tickets">
			<div className="flex min-h-screen flex-col lg:flex-row">
				{/* Main Content */}
				<div className="flex-1 p-4">
					<div className="flex flex-col gap-4">
						{/* Page Header */}
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="icon"
									onClick={handleBack}
									aria-label="Back to tickets"
								>
									<ArrowLeft className="h-4 w-4" />
								</Button>
								<h1 className="text-xl font-medium">{title}</h1>
							</div>
							<div className="flex flex-wrap gap-2">
								{badges.map((badge, index) => (
									<Badge key={index} variant={badge.variant}>
										{badge.text}
									</Badge>
								))}
							</div>
						</div>

						{/* Ticket Trends Chart */}
						<TicketTrendsChart />
						 

						{/* Table Section */}
						<ClusterDetailTable clusterId={id} />
					</div>
				</div>

				{/* Right Sidebar */}
				<ClusterDetailSidebar
					clusterId={id}
					clusterName={title}
					openTicketsCount={ticketGroup?.openCount ?? 0}
					knowledgeCount={3}
				/>
			</div>
		</RitaLayout>
	);
}
