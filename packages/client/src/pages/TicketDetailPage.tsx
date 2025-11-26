import { useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Badge } from "@/components/ui/badge";
import { TicketDetailSidebar } from "@/components/tickets/TicketDetailSidebar";
import { TicketTrendsChart } from "@/components/tickets/TicketTrendsChart";
import { TicketDetailTable } from "@/components/tickets/TicketDetailTable";

const badges = [
	{ text: "976 tickets", variant: "secondary" as const },
	{ text: "14 open", variant: "secondary" as const },
	{ text: "12% automated", variant: "secondary" as const },
	{ text: "Knowledge found", variant: "outline" as const },
];

export default function TicketDetailPage() {
	const { id } = useParams<{ id: string }>();

	// Convert id to title (replace hyphens with spaces and capitalize)
	const title = id
		? id
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ")
		: "Ticket Group";

	return (
		<RitaLayout activePage="tickets">
			<div className="flex min-h-screen flex-col lg:flex-row">
				{/* Main Content */}
				<div className="flex-1 p-4">
					<div className="flex flex-col gap-4">
						{/* Page Header */}
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
							<h1 className="text-xl font-medium">{title}</h1>
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
						<TicketDetailTable />
					</div>
				</div>

				{/* Right Sidebar */}
				<TicketDetailSidebar knowledgeCount={3} />
			</div>
		</RitaLayout>
	);
}
