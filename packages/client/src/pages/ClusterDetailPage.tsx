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
import { CreateKnowledgeArticleSheet } from "@/components/tickets/CreateKnowledgeArticleSheet";
import { EnableAutoPopulateSheet } from "@/components/tickets/EnableAutoPopulateSheet";
import { EnableAutoRespondModal } from "@/components/tickets/EnableAutoRespondModal";
import ReviewAIResponseSheet, {
	type ReviewTicket,
} from "@/components/tickets/ReviewAIResponseSheet";
import { AgentDryRunSheet } from "@/components/tickets/v4/AgentDryRunSheet";
import { AgentRunHistory } from "@/components/tickets/v4/AgentRunHistory";
import { ClusterAgentCard } from "@/components/tickets/v4/ClusterAgentCard";
import { EvaluationKickoffSheet } from "@/components/tickets/v4/EvaluationKickoffSheet";
import { EvaluationsTab } from "@/components/tickets/v4/EvaluationsTab";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMockAgentById } from "@/data/mock-v4-agents";
import { useClusterDetails } from "@/hooks/useClusters";
import { usePhaseGate } from "@/hooks/usePhaseGate";
import { getClusterDisplayTitle } from "@/lib/cluster-utils";
import {
	type AgentRun,
	useClusterAgentStore,
} from "@/stores/clusterAgentStore";
import { usePresenterStore } from "@/stores/presenterStore";
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

export default function ClusterDetailPage() {
	const { t } = useTranslation("tickets");
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const phaseV2 = usePhaseGate("tickets", "v2");
	const phaseV3 = usePhaseGate("tickets", "v3");
	const phaseV4 = usePhaseGate("tickets", "v4");
	const { data: cluster, isLoading, error } = useClusterDetails(id);
	const attachedAgentId = useClusterAgentStore((s) =>
		id ? (s.bindings[id] ?? null) : null,
	);
	const attachedAgent = getMockAgentById(attachedAgentId);
	const [dryRunTicket, setDryRunTicket] = useState<{
		id: string;
		externalId?: string;
		title: string;
	} | null>(null);
	const [replayRun, setReplayRun] = useState<AgentRun | null>(null);
	const [evalKickoffOpen, setEvalKickoffOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"tickets" | "evaluations">(
		"tickets",
	);

	// Presenter mode: observe scripted "open this ticket" directive
	const scriptedTicket = usePresenterStore((s) => s.scriptedOpenTicket);
	useEffect(() => {
		if (!phaseV4 || !attachedAgent || !scriptedTicket) return;
		setDryRunTicket({
			id: scriptedTicket.ticketId,
			externalId: scriptedTicket.externalId,
			title: scriptedTicket.title,
		});
	}, [phaseV4, attachedAgent, scriptedTicket]);
	const { blendedRatePerHour, avgMinutesPerTicket } = useTicketSettingsStore();
	const bannerRef = useRef<HTMLDivElement>(null);
	const [autoRespondOpen, setAutoRespondOpen] = useState(false);
	const [autoPopulateOpen, setAutoPopulateOpen] = useState(false);
	const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
	const [reviewIndex, setReviewIndex] = useState(0);
	const [autoRespondEnabled, setAutoRespondEnabled] = useState(false);
	const [autoPopulateEnabled, setAutoPopulateEnabled] = useState(false);
	const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(
		new Set(),
	);
	const [createKnowledgeOpen, setCreateKnowledgeOpen] = useState(false);
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

	// Mock review tickets for v3 AI response review
	const mockReviewTickets: ReviewTicket[] = [
		{
			id: "t1",
			externalId: "INC001234",
			title: "VPN not connecting after update",
			description:
				"User reports VPN client fails to connect after the latest Windows update.",
			priority: "high",
		},
		{
			id: "t2",
			externalId: "INC001235",
			title: "Email sync delay on mobile",
			description: "Emails are taking 30+ minutes to sync on the mobile app.",
			priority: "medium",
		},
		{
			id: "t3",
			externalId: "INC001236",
			title: "Printer offline in Building C",
			description:
				"The shared printer on floor 3 shows offline status for all users.",
			priority: "low",
		},
	];

	const mockAIResponse = {
		content:
			"Based on similar resolved tickets, the VPN issue is likely caused by the recent Windows update modifying firewall rules. Please try: 1) Open Windows Firewall settings, 2) Re-enable the VPN exception rule, 3) Restart the VPN client.",
		kbArticles: [
			{ id: "kb1", title: "VPN Troubleshooting Guide", relevanceScore: 0.92 },
		],
		confidenceScore: 87,
	};

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
							{phaseV3 && !phaseV4 && cluster.kb_status === "GAP" && (
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
									value={`$${(blendedRatePerHour * (avgMinutesPerTicket / 60) * cluster.ticket_count).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
									label={t("clusterDetail.stats.estMoneySaved")}
									loading={false}
								/>
							)}
							{phaseV2 && (
								<StatCard
									value={`${Math.floor((avgMinutesPerTicket * cluster.ticket_count) / 60)}hr`}
									label={
										<span className="flex items-center gap-1">
											{t("clusterDetail.stats.estTimeSaved")}
											<Tooltip>
												<TooltipTrigger asChild>
													<Info className="size-3 text-muted-foreground" />
												</TooltipTrigger>
												<TooltipContent
													side="bottom"
													className="max-w-[220px] text-xs"
												>
													{avgMinutesPerTicket} min ×{" "}
													{cluster.ticket_count.toLocaleString()} tickets
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
						{phaseV4 ? (
							<Tabs
								value={activeTab}
								onValueChange={(v) =>
									setActiveTab(v as "tickets" | "evaluations")
								}
							>
								<TabsList>
									<TabsTrigger value="tickets">Tickets</TabsTrigger>
									<TabsTrigger value="evaluations">Evaluations</TabsTrigger>
								</TabsList>
								<TabsContent value="tickets">
									<ClusterDetailTable
										key={id}
										clusterId={id}
										totalCount={cluster.ticket_count}
										openCount={cluster.open_count}
										enableSelect={phaseV3}
										selectedIds={selectedTicketIds}
										onSelectionChange={setSelectedTicketIds}
										onBulkReview={() => {
											setReviewIndex(0);
											setReviewSheetOpen(true);
										}}
										onRunAgent={
											attachedAgent
												? (ticket) => setDryRunTicket(ticket)
												: undefined
										}
									/>
								</TabsContent>
								<TabsContent value="evaluations">
									<EvaluationsTab
										clusterId={id ?? ""}
										clusterName={title}
										agent={attachedAgent}
									/>
								</TabsContent>
							</Tabs>
						) : (
							<ClusterDetailTable
								key={id}
								clusterId={id}
								totalCount={cluster.ticket_count}
								openCount={cluster.open_count}
								enableSelect={phaseV3}
								selectedIds={selectedTicketIds}
								onSelectionChange={setSelectedTicketIds}
								onBulkReview={() => {
									setReviewIndex(0);
									setReviewSheetOpen(true);
								}}
							/>
						)}
					</div>
				</div>

				{/* Knowledge Sidebar + Full Autopilot (v3) */}
				{phaseV3 && (
					<div className="w-full lg:w-80 lg:shrink-0 lg:border-l flex flex-col gap-0 overflow-y-auto">
						{!phaseV4 && (
							<ClusterDetailSidebar
								clusterId={id}
								clusterName={title}
								kbArticlesCount={cluster.kb_articles_count}
								kbStatus={cluster.kb_status}
							/>
						)}
						<div className="flex flex-col gap-4 p-4">
							{phaseV4 && id && (
								<ClusterAgentCard
									clusterId={id}
									onEvaluate={() => {
										setActiveTab("evaluations");
										setEvalKickoffOpen(true);
									}}
								/>
							)}
							{phaseV4 && id && attachedAgent && (
								<AgentRunHistory
									clusterId={id}
									onOpenRun={(run) => setReplayRun(run)}
								/>
							)}
							{!phaseV4 && (
								<AutomationReadinessMeter
									reviewed={8}
									total={12}
									hasKnowledge={cluster.kb_status === "FOUND" || knowledgeAdded}
									trustedPercentage={
										cluster.kb_status === "FOUND" || knowledgeAdded ? 85 : 0
									}
									isAutomationEnabled={autoRespondEnabled}
									onEnableAutoRespond={() => setAutoRespondOpen(true)}
									onAddKnowledge={() => setCreateKnowledgeOpen(true)}
									onReviewKnowledge={() =>
										navigate("/settings/connections/knowledge")
									}
								/>
							)}
							{(autoRespondEnabled || autoPopulateEnabled) && (
								<AutomationMetricsCard
									automated={
										autoRespondEnabled
											? Math.floor(cluster.open_count * 0.12)
											: 0
									}
								/>
							)}
							{!phaseV4 && (
								<AutoPilotRecommendations
									onEnableClick={handleRecommendationEnable}
								/>
							)}
						</div>
					</div>
				)}
			</div>

			{/* v4: Dry-run sheet */}
			{phaseV4 && id && (
				<AgentDryRunSheet
					open={!!dryRunTicket}
					onOpenChange={(o) => !o && setDryRunTicket(null)}
					agent={attachedAgent}
					ticket={dryRunTicket}
					clusterId={id}
				/>
			)}

			{/* v4: Replay a logged run in read-only */}
			{phaseV4 && id && (
				<AgentDryRunSheet
					open={!!replayRun}
					onOpenChange={(o) => !o && setReplayRun(null)}
					agent={replayRun ? getMockAgentById(replayRun.agentId) : null}
					ticket={
						replayRun
							? {
									id: replayRun.ticketId,
									externalId: replayRun.ticketExternalId,
									title: replayRun.ticketExternalId ?? replayRun.ticketId,
								}
							: null
					}
					clusterId={id}
					readOnlyRun={replayRun}
				/>
			)}

			{/* v4: Evaluation kickoff (from agent card "Evaluate" CTA) */}
			{phaseV4 && id && attachedAgent && (
				<EvaluationKickoffSheet
					open={evalKickoffOpen}
					onOpenChange={setEvalKickoffOpen}
					clusterId={id}
					clusterName={title}
					agent={attachedAgent}
				/>
			)}

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
							{
								label: "Category",
								currentValue: null,
								predictedValue: "Network",
							},
							{
								label: "Assignment Group",
								currentValue: null,
								predictedValue: "IT Support L2",
							},
						]}
						onEnable={handleAutoPopulateEnabled}
					/>
					<CreateKnowledgeArticleSheet
						open={createKnowledgeOpen}
						onOpenChange={setCreateKnowledgeOpen}
						ticketGroupName={title}
						onKnowledgeAdded={() => {
							setKnowledgeAdded(true);
							showBanner(
								"success",
								t("clusterDetail.banners.knowledgeAdded"),
								t("clusterDetail.banners.knowledgeAddedDesc"),
							);
						}}
					/>
					<ReviewAIResponseSheet
						open={reviewSheetOpen}
						onOpenChange={setReviewSheetOpen}
						ticketGroupId={id}
						tickets={mockReviewTickets}
						currentIndex={reviewIndex}
						aiResponse={mockAIResponse}
						onNavigate={setReviewIndex}
						onApprove={(ticketId) => console.log("Approved:", ticketId)}
						onReject={(ticketId) => console.log("Rejected:", ticketId)}
						onKeepReviewing={() => {
							setReviewIndex(0);
						}}
						onReviewComplete={(stats) => {
							if (stats.confidenceImprovement > 50) fireConfetti();
							showBanner(
								"success",
								t("clusterDetail.banners.reviewSuccess", {
									count: stats.totalReviewed,
								}),
								t("clusterDetail.banners.reviewSuccessDesc", {
									trusted: stats.trusted,
									improvement: stats.confidenceImprovement,
								}),
							);
						}}
					/>
				</>
			)}
		</RitaLayout>
	);
}
