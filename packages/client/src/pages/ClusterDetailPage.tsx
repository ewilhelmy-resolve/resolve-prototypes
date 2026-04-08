import confetti from "canvas-confetti";
import { ArrowLeft, BookX, Info, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import { AutomationMetricsCard } from "@/components/tickets/AutomationMetricsCard";
import { AutomationReadinessMeter } from "@/components/tickets/AutomationReadinessMeter";
import { AutoPilotRecommendations } from "@/components/tickets/AutoPilotRecommendations";
import { ClusterDetailSidebar } from "@/components/tickets/ClusterDetailSidebar";
import { ClusterDetailTable } from "@/components/tickets/ClusterDetailTable";
import { EnableAutoPopulateSheet } from "@/components/tickets/EnableAutoPopulateSheet";
import { EnableAutoRespondModal } from "@/components/tickets/EnableAutoRespondModal";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	useClusterDetails,
} from "@/hooks/useClusters";
import { usePhaseGate } from "@/hooks/usePhaseGate";
import { getClusterDisplayTitle } from "@/lib/cluster-utils";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";

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
	const phaseV2 = usePhaseGate("tickets", "v2");
	const phaseV3 = usePhaseGate("tickets", "v3");
	const { data: cluster, isLoading, error } = useClusterDetails(id);
	const { blendedRatePerHour, timeToTake } = useTicketSettingsStore();
	const bannerRef = useRef<HTMLDivElement>(null);
	const [autoRespondOpen, setAutoRespondOpen] = useState(false);
	const [autoPopulateOpen, setAutoPopulateOpen] = useState(false);
	const [autoRespondEnabled, setAutoRespondEnabled] = useState(false);
	const [autoPopulateEnabled, setAutoPopulateEnabled] = useState(false);

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

	const handleAutoRespondEnabled = (
		ticketGroupName: string,
		automatedPercentage: number,
	) => {
		setAutoRespondEnabled(true);
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

	const handleAutoPopulateEnabled = () => {
		setAutoPopulateEnabled(true);
		showBanner("enriched", t("clusterDetail.banners.enrichedTickets"));
	};

	const handleRecommendationEnable = (type: string) => {
		if (type === "auto_respond") setAutoRespondOpen(true);
		else if (type === "auto_populate") setAutoPopulateOpen(true);
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
							{phaseV3 && cluster.kb_status === "GAP" && (
								<Tooltip>
									<TooltipTrigger asChild>
										<BookX className="size-4 text-amber-500" />
									</TooltipTrigger>
									<TooltipContent>Knowledge Gap</TooltipContent>
								</Tooltip>
							)}
						</div>

						{/* Stats */}
						<StatGroup columns={phaseV3 ? 6 : phaseV2 ? 4 : 2}>
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
							{phaseV2 && (
								<StatCard
									value={`$${(blendedRatePerHour * (timeToTake / 60) * cluster.ticket_count).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
									label={t("clusterDetail.stats.estMoneySaved")}
									loading={false}
								/>
							)}
							{phaseV2 && (
								<StatCard
									value={`${Math.floor((timeToTake * cluster.ticket_count) / 60)}hr`}
									label={
										<span className="flex items-center gap-1">
											{t("clusterDetail.stats.estTimeSaved")}
											<Tooltip>
												<TooltipTrigger asChild>
													<Info className="size-3 text-muted-foreground" />
												</TooltipTrigger>
												<TooltipContent side="bottom" className="max-w-[220px] text-xs">
													{timeToTake} min × {cluster.ticket_count.toLocaleString()} tickets
												</TooltipContent>
											</Tooltip>
										</span>
									}
									loading={false}
								/>
							)}
							{phaseV3 && (
								<StatCard
									value="4.2hr"
									label={t("clusterDetail.stats.mttr")}
									loading={false}
								/>
							)}
							{phaseV3 && (
								<StatCard
									value="1.8"
									label={t("clusterDetail.stats.avgReassignmentRate")}
									loading={false}
								/>
							)}
						</StatGroup>

						{/* Table Section */}
						<ClusterDetailTable key={id} clusterId={id} totalCount={cluster.ticket_count} openCount={cluster.open_count} />
					</div>
				</div>

				{/* Knowledge Sidebar + Full Autopilot (v3) */}
				{phaseV3 && (
					<div className="w-full lg:w-80 lg:shrink-0 lg:border-l flex flex-col gap-0 overflow-y-auto">
						<ClusterDetailSidebar
							clusterId={id}
							clusterName={title}
							kbArticlesCount={cluster.kb_articles_count}
							kbStatus={cluster.kb_status}
						/>
						<div className="flex flex-col gap-4 p-4">
							<AutomationReadinessMeter
								reviewed={8}
								total={12}
								hasKnowledge={cluster.kb_status === "FOUND"}
								trustedPercentage={cluster.kb_status === "FOUND" ? 85 : 0}
								isAutomationEnabled={autoRespondEnabled}
								onEnableAutoRespond={() => setAutoRespondOpen(true)}
								onAddKnowledge={() => navigate("/settings/connections/knowledge")}
							/>
							{(autoRespondEnabled || autoPopulateEnabled) && (
								<AutomationMetricsCard
									automated={autoRespondEnabled ? Math.floor(cluster.open_count * 0.12) : 0}
								/>
							)}
							<AutoPilotRecommendations
								onEnableClick={handleRecommendationEnable}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Autopilot Modals (v3) */}
			{phaseV3 && (
				<>
					<EnableAutoRespondModal
						open={autoRespondOpen}
						onOpenChange={setAutoRespondOpen}
						ticketGroupName={title}
						openTicketsCount={cluster.open_count}
						onAutoRespondEnabled={handleAutoRespondEnabled}
					/>
					<EnableAutoPopulateSheet
						open={autoPopulateOpen}
						onOpenChange={setAutoPopulateOpen}
						predictions={[
							{ label: "Priority", currentValue: null, predictedValue: "High" },
							{ label: "Category", currentValue: null, predictedValue: "Network" },
							{ label: "Assignment Group", currentValue: null, predictedValue: "IT Support L2" },
						]}
						onEnable={handleAutoPopulateEnabled}
					/>
				</>
			)}
		</RitaLayout>
	);
}
