import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { ClusterDetailSidebar } from "@/components/tickets/ClusterDetailSidebar";
import { ClusterDetailTable } from "@/components/tickets/ClusterDetailTable";
import { TicketTrendsChart } from "@/components/tickets/TicketTrendsChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClusterDetails } from "@/hooks/useClusters";
import { KB_STATUS_BADGE_STYLES } from "@/lib/constants";

export default function ClusterDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: cluster, isLoading, error } = useClusterDetails(id);

	const handleBack = () => {
		navigate("/tickets");
	};

	// Build display title from name + subcluster_name
	const getDisplayTitle = () => {
		if (!cluster) return "Cluster";
		if (cluster.subcluster_name) {
			return `${cluster.name} - ${cluster.subcluster_name}`;
		}
		return cluster.name;
	};

	const getKnowledgeStatusBadge = () => {
		if (!cluster) return null;
		const style = KB_STATUS_BADGE_STYLES[cluster.kb_status];
		if (!style) return null;
		return style;
	};

	if (isLoading) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex min-h-screen items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</RitaLayout>
		);
	}

	if (error || !cluster) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex min-h-screen flex-col items-center justify-center gap-4">
					<p className="text-destructive">Failed to load cluster details</p>
					<Button variant="outline" onClick={handleBack}>
						Back to tickets
					</Button>
				</div>
			</RitaLayout>
		);
	}

	const title = getDisplayTitle();
	const knowledgeStatusBadge = getKnowledgeStatusBadge();

	const badges = [
		{
			text: `${cluster.ticket_count} tickets`,
			variant: "secondary" as const,
			className: "",
		},
		{
			text: `${cluster.open_count} open`,
			variant: "secondary" as const,
			className: "",
		},
		{
			text: `${cluster.kb_articles_count} KB articles`,
			variant: "secondary" as const,
			className: "",
		},
		...(knowledgeStatusBadge ? [knowledgeStatusBadge] : []),
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
									<Badge
										key={index}
										variant={badge.variant}
										className={badge.className}
									>
										{badge.text}
									</Badge>
								))}
							</div>
						</div>

						{/* Ticket Trends Chart */}
						<TicketTrendsChart />

						{/* Table Section */}
						<ClusterDetailTable key={id} clusterId={id} />
					</div>
				</div>

				{/* Right Sidebar */}
				<ClusterDetailSidebar
					clusterId={id}
					clusterName={title}
					knowledgeCount={cluster.kb_articles_count}
					kbStatus={cluster.kb_status}
				/>
			</div>
		</RitaLayout>
	);
}
