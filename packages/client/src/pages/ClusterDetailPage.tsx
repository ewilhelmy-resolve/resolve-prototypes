import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { clusterKeys, useClusterDetails } from "@/hooks/useClusters";
import { getClusterDisplayTitle } from "@/lib/cluster-utils";
import {
	calculateEstMoneySaved,
	calculateEstTimeSavedMinutes,
	formatMoneySaved,
	formatTimeSaved,
	STAT_NOT_AVAILABLE,
} from "@/lib/format-utils";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";

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
	const queryClient = useQueryClient();
	const { data: cluster, isLoading, error } = useClusterDetails(id);
	const bannerRef = useRef<HTMLDivElement>(null);

	// Banner state — key increments on each new banner to trigger scroll even when already visible
	const [bannerData, setBannerData] = useState<{
		visible: boolean;
		variant: "success" | "destructive" | "enriched";
		title: string;
		description?: string;
		key: number;
	}>({ visible: false, variant: "success", title: "", key: 0 });

	const { blendedRatePerHour, avgMinutesPerTicket } = useTicketSettingsStore();

	const handleBack = () => {
		navigate("/tickets");
	};

	const handleKnowledgeAdded = () => {
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
	const moneySaved = calculateEstMoneySaved(
		blendedRatePerHour,
		avgMinutesPerTicket,
		cluster.ticket_count,
	);
	const timeSavedMinutes = calculateEstTimeSavedMinutes(
		avgMinutesPerTicket,
		cluster.ticket_count,
	);

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
						</div>

						{/* Cluster Metrics */}
						<StatGroup columns={6}>
							<StatCard
								value={cluster.ticket_count.toLocaleString()}
								label={t("clusterDetail.stats.totalTickets")}
							/>
							<StatCard
								value={cluster.open_count.toLocaleString()}
								label={t("clusterDetail.stats.openTickets")}
							/>
							<StatCard
								value={formatMoneySaved(moneySaved)}
								label={t("clusterDetail.stats.estMoneySaved")}
							/>
							<StatCard
								value={formatTimeSaved(timeSavedMinutes)}
								label={t("clusterDetail.stats.estTimeSaved")}
							/>
							<StatCard
								value={STAT_NOT_AVAILABLE}
								label={t("clusterDetail.stats.mttr")}
							/>
							<StatCard
								value={STAT_NOT_AVAILABLE}
								label={t("clusterDetail.stats.avgReassignmentRate")}
							/>
						</StatGroup>

						{/* Table Section */}
						<ClusterDetailTable
							key={id}
							clusterId={id}
							totalCount={cluster.ticket_count}
							openCount={cluster.open_count}
						/>
					</div>
				</div>

				{/* Right Sidebar */}
				<ClusterDetailSidebar
					clusterId={id}
					clusterName={title}
					kbArticlesCount={cluster.kb_articles_count}
					kbStatus={cluster.kb_status}
					onKnowledgeAdded={handleKnowledgeAdded}
				/>
			</div>
		</RitaLayout>
	);
}
