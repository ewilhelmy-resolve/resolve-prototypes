import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { ClusterDetailSidebar } from "@/components/tickets/ClusterDetailSidebar";
import { TicketTrendsChart } from "@/components/tickets/TicketTrendsChart";
import { ClusterDetailTable } from "@/components/tickets/ClusterDetailTable";
import { getTicketGroup } from "@/lib/tickets/utils";
import type { ReviewStats } from "@/components/tickets/ReviewAIResponseSheet";

export default function ClusterDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const ticketGroup = id ? getTicketGroup(id) : undefined;
	const bannerRef = useRef<HTMLDivElement>(null);

	// Banner state for review completion and auto-populate
	// key increments on each new banner to trigger scroll even when already visible
	const [bannerData, setBannerData] = useState<{
		visible: boolean;
		variant: "success" | "destructive" | "enriched";
		title: string;
		description?: string;
		key: number;
	}>({ visible: false, variant: "success", title: "", key: 0 });

	const handleBack = () => {
		navigate("/tickets");
	};

	const handleReviewComplete = (stats: ReviewStats) => {
		const { trusted, totalReviewed, confidenceImprovement } = stats;

		if (confidenceImprovement > 0) {
			setBannerData((prev) => ({
				visible: true,
				variant: "success",
				title: `Great job! You reviewed ${totalReviewed} responses.`,
				description: `${trusted} trusted (${confidenceImprovement}% confidence)`,
				key: prev.key + 1,
			}));
		} else {
			setBannerData((prev) => ({
				visible: true,
				variant: "destructive",
				title: "Review completed with areas for improvement",
				description: `${totalReviewed} responses reviewed. Consider refining AI training data.`,
				key: prev.key + 1,
			}));
		}
	};

	const handleAutoPopulateEnabled = () => {
		setBannerData((prev) => ({
			visible: true,
			variant: "enriched",
			title: "You just enriched tickets for this group!",
			key: prev.key + 1,
		}));
	};

	const handleKnowledgeAdded = () => {
		setBannerData((prev) => ({
			visible: true,
			variant: "success",
			title: "New knowledge added!",
			description: "You just improved your knowledge to better auto-respond to issues.",
			key: prev.key + 1,
		}));
	};

	const handleAutoRespondEnabled = (ticketGroupName: string, automatedPercentage: number) => {
		setBannerData((prev) => ({
			visible: true,
			variant: "enriched",
			title: `You just automated ${automatedPercentage}% of your work!`,
			description: `Auto-respond is set to respond to all future tickets in "${ticketGroupName}"`,
			key: prev.key + 1,
		}));
	};

	const handleDismissBanner = () => {
		setBannerData((prev) => ({ visible: false, variant: "success", title: "", key: prev.key }));
	};

	// Scroll banner into view when it becomes visible or changes
	useEffect(() => {
		if (bannerData.visible && bannerRef.current) {
			bannerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [bannerData.key, bannerData.visible]);

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
			{/* Feedback Banner */}
			{bannerData.visible && (
				<div ref={bannerRef}>
					<FeedbackBanner
						variant={bannerData.variant}
						title={bannerData.title}
						description={bannerData.description}
						onDismiss={handleDismissBanner}
					/>
				</div>
			)}

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
						<ClusterDetailTable clusterId={id} onReviewComplete={handleReviewComplete} />
					</div>
				</div>

				{/* Right Sidebar */}
				<ClusterDetailSidebar
					clusterId={id}
					clusterName={title}
					openTicketsCount={ticketGroup?.openCount ?? 0}
					knowledgeCount={3}
					onAutoPopulateEnabled={handleAutoPopulateEnabled}
					onKnowledgeAdded={handleKnowledgeAdded}
					onAutoRespondEnabled={handleAutoRespondEnabled}
				/>
			</div>
		</RitaLayout>
	);
}
