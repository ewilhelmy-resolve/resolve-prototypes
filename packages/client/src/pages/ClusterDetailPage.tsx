import confetti from "canvas-confetti";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { ClusterDetailSidebar } from "@/components/tickets/ClusterDetailSidebar";
import { ClusterDetailTable } from "@/components/tickets/ClusterDetailTable";
import type { ReviewStats } from "@/components/tickets/ReviewAIResponseSheet";
import { TicketTrendsChart } from "@/components/tickets/TicketTrendsChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { useClusterDetails } from "@/hooks/useClusters";
import { KB_STATUS_BADGE_STYLES } from "@/lib/constants";

/** Fire confetti animation for success/enriched banners */
const fireConfetti = () => {
	const defaults = {
		spread: 360,
		ticks: 100,
		gravity: 0.3,
		decay: 0.96,
		startVelocity: 30,
	};

	const shoot = () => {
		confetti({
			...defaults,
			particleCount: 40,
			scalar: 1.2,
			shapes: ["star", "square", "circle"],
		});

		confetti({
			...defaults,
			particleCount: 10,
			scalar: 0.75,
			shapes: ["star", "square", "circle"],
		});
	};

	setTimeout(shoot, 0);
	setTimeout(shoot, 100);
	setTimeout(shoot, 200);
	setTimeout(shoot, 400);
	setTimeout(shoot, 600);
};

export default function ClusterDetailPage() {
	const { t } = useTranslation("tickets");
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: cluster, isLoading, error } = useClusterDetails(id);
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
			fireConfetti();
			setBannerData((prev) => ({
				visible: true,
				variant: "success",
				title: t("clusterDetail.banners.reviewSuccess", { count: totalReviewed }),
				description: t("clusterDetail.banners.reviewSuccessDesc", { trusted, improvement: confidenceImprovement }),
				key: prev.key + 1,
			}));
		} else {
			setBannerData((prev) => ({
				visible: true,
				variant: "destructive",
				title: t("clusterDetail.banners.reviewNeedsImprovement"),
				description: t("clusterDetail.banners.reviewNeedsImprovementDesc", { count: totalReviewed }),
				key: prev.key + 1,
			}));
		}
	};

	const handleAutoPopulateEnabled = () => {
		fireConfetti();
		setBannerData((prev) => ({
			visible: true,
			variant: "enriched",
			title: t("clusterDetail.banners.enrichedTickets"),
			key: prev.key + 1,
		}));
	};

	const handleKnowledgeAdded = () => {
		fireConfetti();
		setBannerData((prev) => ({
			visible: true,
			variant: "success",
			title: t("clusterDetail.banners.knowledgeAdded"),
			description: t("clusterDetail.banners.knowledgeAddedDesc"),
			key: prev.key + 1,
		}));
	};

	const handleAutoRespondEnabled = (
		ticketGroupName: string,
		automatedPercentage: number,
	) => {
		fireConfetti();
		setBannerData((prev) => ({
			visible: true,
			variant: "enriched",
			title: t("clusterDetail.banners.automatedWork", { percentage: automatedPercentage }),
			description: t("clusterDetail.banners.automatedWorkDesc", { groupName: ticketGroupName }),
			key: prev.key + 1,
		}));
	};

	const handleDismissBanner = () => {
		setBannerData((prev) => ({
			visible: false,
			variant: "success",
			title: "",
			key: prev.key,
		}));
	};

	// Scroll banner into view when it becomes visible or changes
	// bannerData.key changes trigger re-scroll even if visible stays true
	const bannerKey = bannerData.key;
	useEffect(() => {
		void bannerKey; // Reference key to trigger effect on banner changes
		if (bannerData.visible && bannerRef.current) {
			bannerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [bannerKey, bannerData.visible]);

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
					<p className="text-destructive">{t("clusterDetail.failedToLoad")}</p>
					<Button variant="outline" onClick={handleBack}>
						{t("clusterDetail.backToTickets")}
					</Button>
				</div>
			</RitaLayout>
		);
	}

	const title = getDisplayTitle();
	const knowledgeStatusBadge = getKnowledgeStatusBadge();

	const badges = [
		{
			text: t("clusterDetail.badges.tickets", { count: cluster.ticket_count }),
			variant: "secondary" as const,
			className: "",
		},
		{
			text: t("clusterDetail.badges.open", { count: cluster.open_count }),
			variant: "secondary" as const,
			className: "",
		},
		{
			text: t("clusterDetail.badges.kbArticles", { count: cluster.kb_articles_count }),
			variant: "secondary" as const,
			className: "",
		},
		...(knowledgeStatusBadge ? [knowledgeStatusBadge] : []),
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
									aria-label={t("clusterDetail.backToTickets")}
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
						<ClusterDetailTable
							key={id}
							clusterId={id}
							onReviewComplete={handleReviewComplete}
						/>
					</div>
				</div>

				{/* Right Sidebar */}
				<ClusterDetailSidebar
					clusterId={id}
					clusterName={title}
					knowledgeCount={cluster.kb_articles_count}
					kbStatus={cluster.kb_status}
					onAutoPopulateEnabled={handleAutoPopulateEnabled}
					onKnowledgeAdded={handleKnowledgeAdded}
					onAutoRespondEnabled={handleAutoRespondEnabled}
				/>
			</div>
		</RitaLayout>
	);
}
