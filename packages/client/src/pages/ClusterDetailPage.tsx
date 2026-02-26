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
import { Badge } from "@/components/ui/badge";
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
import {
	AUTOMATION_GAP_BADGE_STYLE,
	KB_STATUS_BADGE_STYLES,
} from "@/lib/constants";

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

export default function ClusterDetailPage() {
	const { t } = useTranslation("tickets");
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: cluster, isLoading, error } = useClusterDetails(id);
	const { data: hasAction } = useClusterHasAction(id);
	const bannerRef = useRef<HTMLDivElement>(null);

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

	const handleKnowledgeAdded = () => {
		fireConfetti();
		// Refetch cluster details (kb_status) and KB articles list
		if (id) {
			void queryClient.invalidateQueries({ queryKey: clusterKeys.detail(id) });
			void queryClient.invalidateQueries({
				queryKey: clusterKeys.kbArticleList(id),
			});
		}
		setBannerData((prev) => ({
			visible: true,
			variant: "success",
			title: t("clusterDetail.banners.knowledgeAdded"),
			description: t("clusterDetail.banners.knowledgeAddedDesc"),
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
	const bannerKey = bannerData.key;
	useEffect(() => {
		void bannerKey;
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
							{KB_STATUS_BADGE_STYLES[cluster.kb_status] && (
								<Badge
									variant={KB_STATUS_BADGE_STYLES[cluster.kb_status].variant}
									className={
										KB_STATUS_BADGE_STYLES[cluster.kb_status].className
									}
								>
									{KB_STATUS_BADGE_STYLES[cluster.kb_status].text}
								</Badge>
							)}
							{hasAction === false && (
								<Badge
									variant={AUTOMATION_GAP_BADGE_STYLE.variant}
									className={AUTOMATION_GAP_BADGE_STYLE.className}
								>
									{AUTOMATION_GAP_BADGE_STYLE.text}
								</Badge>
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
							<Tooltip>
								<TooltipTrigger asChild>
									<div>
										<StatCard
											value="--"
											label={t("clusterDetail.stats.mttr")}
											badge={
												<Badge
													variant="secondary"
													className="text-[10px] px-1.5 py-0"
												>
													{t("clusterDetail.stats.comingSoon")}
												</Badge>
											}
										/>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									{t("clusterDetail.stats.mttrTooltip")}
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<div>
										<StatCard
											value="--"
											label={t("clusterDetail.stats.avgReassignmentRate")}
											badge={
												<Badge
													variant="secondary"
													className="text-[10px] px-1.5 py-0"
												>
													{t("clusterDetail.stats.comingSoon")}
												</Badge>
											}
										/>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									{t("clusterDetail.stats.reassignmentTooltip")}
								</TooltipContent>
							</Tooltip>
						</StatGroup>

						{/* Table Section */}
						<ClusterDetailTable key={id} clusterId={id} />
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
