import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { ArrowLeft, BookX, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import { ClusterDetailSidebar } from "@/components/tickets/ClusterDetailSidebar";
import { ClusterDetailTable } from "@/components/tickets/ClusterDetailTable";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	clusterKeys,
	useClusterDetails,
	useClusterHasAction,
} from "@/hooks/useClusters";
import { getClusterDisplayTitle } from "@/lib/cluster-utils";

/** Default cost setting (matches TicketSettingsDialog default) */
const COST_PER_TICKET = 30;

/** Fire confetti animation for success/enriched banners (stops after 2 sec) */
const fireConfetti = () => {
	const defaults = {
		spread: 360,
		ticks: 50,
		gravity: 0.5,
		decay: 0.94,
		startVelocity: 25,
	};

	const shoot = () => {
		confetti({
			...defaults,
			particleCount: 30,
			scalar: 1.2,
			shapes: ["star", "square", "circle"],
		});
	};

	// Quick bursts
	setTimeout(shoot, 0);
	setTimeout(shoot, 150);
	setTimeout(shoot, 300);

	// Force stop after 2 seconds
	setTimeout(() => {
		confetti.reset();
	}, 2000);
};

interface ReviewStats {
	trusted: number;
	totalReviewed: number;
	confidenceImprovement: number;
}

export default function ClusterDetailPage() {
	const { t } = useTranslation("tickets");
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: cluster, isLoading, error } = useClusterDetails(id);
	const { data: hasAction } = useClusterHasAction(id);
	const bannerRef = useRef<HTMLDivElement>(null);
	const [knowledgeAdded, setKnowledgeAdded] = useState(false);

	// Banner state for review completion
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

	const showBanner = (
		variant: "success" | "destructive" | "enriched",
		title: string,
		description?: string,
		withConfetti = true,
	) => {
		if (withConfetti) fireConfetti();
		setBannerData((prev) => ({
			visible: true,
			variant,
			title,
			description,
			key: prev.key + 1,
		}));
	};

	const handleReviewComplete = (stats: ReviewStats) => {
		const { trusted, totalReviewed, confidenceImprovement } = stats;
		if (confidenceImprovement > 0) {
			showBanner(
				"success",
				t("clusterDetail.banners.reviewSuccess", { count: totalReviewed }),
				t("clusterDetail.banners.reviewSuccessDesc", {
					trusted,
					improvement: confidenceImprovement,
				}),
			);
		} else {
			showBanner(
				"destructive",
				t("clusterDetail.banners.reviewNeedsImprovement"),
				t("clusterDetail.banners.reviewNeedsImprovementDesc", {
					count: totalReviewed,
				}),
				false,
			);
		}
	};

	const handleAutoPopulateEnabled = () => {
		showBanner("enriched", t("clusterDetail.banners.enrichedTickets"));
	};

	const handleKnowledgeAdded = () => {
		setKnowledgeAdded(true);
		// Refetch cluster details (kb_status), KB articles, and clusters list
		if (id) {
			void queryClient.invalidateQueries({ queryKey: clusterKeys.detail(id) });
			void queryClient.invalidateQueries({
				queryKey: clusterKeys.kbArticleList(id),
			});
			void queryClient.invalidateQueries({ queryKey: clusterKeys.lists() });
		}
		showBanner(
			"success",
			t("clusterDetail.banners.knowledgeAdded"),
			t("clusterDetail.banners.knowledgeAddedDesc"),
		);
	};

	const handleAutoRespondEnabled = (
		ticketGroupName: string,
		automatedPercentage: number,
	) => {
		showBanner(
			"enriched",
			t("clusterDetail.banners.automatedWork", {
				percentage: automatedPercentage,
			}),
			t("clusterDetail.banners.automatedWorkDesc", {
				groupName: ticketGroupName,
			}),
		);
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
	const bannerKey = bannerData.key;
	useEffect(() => {
		void bannerKey;
		if (bannerData.visible && bannerRef.current) {
			bannerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [bannerKey, bannerData.visible]);

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

	const title = getClusterDisplayTitle(cluster.name, cluster.subcluster_name);

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
				<div className="min-w-0 flex-1 p-4">
					<div className="flex flex-col gap-4">
						{/* Page Header */}
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
							{cluster.kb_status === "GAP" && !knowledgeAdded && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
											<BookX className="h-3.5 w-3.5 text-yellow-600" />
										</span>
									</TooltipTrigger>
									<TooltipContent>{t("gaps.knowledgeGap")}</TooltipContent>
								</Tooltip>
							)}
						</div>

						{/* Stats */}
						<StatGroup columns={5}>
							<StatCard
								value={cluster.ticket_count.toLocaleString()}
								label={t("clusterDetail.stats.totalTickets")}
								loading={false}
							/>
							<StatCard
								value={cluster.open_count.toLocaleString()}
								label={t("clusterDetail.stats.openTickets")}
								loading={false}
							/>
							<StatCard
								value={`$${(cluster.ticket_count * COST_PER_TICKET).toLocaleString()}`}
								label={t("clusterDetail.stats.estImpact")}
								loading={false}
							/>
							<StatCard
								value="4.2hr"
								label={t("clusterDetail.stats.mttr")}
							/>
							<StatCard
								value="1.8"
								label={t("clusterDetail.stats.avgReassignmentRate")}
							/>
						</StatGroup>

						{/* Table Section */}
						<ClusterDetailTable key={id} clusterId={id} totalCount={cluster.ticket_count} openCount={cluster.open_count} />
					</div>
				</div>

				{/* Right Sidebar */}
				<ClusterDetailSidebar
					clusterId={id}
					clusterName={title}
					kbArticlesCount={cluster.kb_articles_count}
					kbStatus={cluster.kb_status}
					hasAction={hasAction ?? false}
					onKnowledgeAdded={handleKnowledgeAdded}
				/>
			</div>
		</RitaLayout>
	);
}
