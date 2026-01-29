import { useTranslation } from "react-i18next";
import { WandSparkles } from "lucide-react";
import { useState } from "react";
import {
	AI_RESPONSE_TYPE,
	type AIResponseType,
	MOCK_AI_RESPONSE,
} from "@/lib/tickets/utils";
import { useDemoStore } from "@/stores/demo-store";
import type { KBStatus } from "@/types/cluster";
import { AutomationMetricsCard } from "./AutomationMetricsCard";
import { AutomationReadinessMeter } from "./AutomationReadinessMeter";
import { AutoPilotRecommendations } from "./AutoPilotRecommendations";
import { CreateKnowledgeArticleSheet } from "./CreateKnowledgeArticleSheet";
import { EnableAutoPopulateSheet } from "./EnableAutoPopulateSheet";
import { EnableAutoRespondModal } from "./EnableAutoRespondModal";
import { RecommendationAlert } from "./RecommendationAlert";

interface ClusterDetailOverviewTabProps {
	/** Cluster display name */
	clusterName?: string;
	/** Number of open tickets in this cluster */
	openTicketsCount?: number;
	/** Knowledge base status from cluster API */
	kbStatus?: KBStatus;
	/** Review stats for readiness meter */
	reviewStats?: { reviewed: number; trusted: number; total: number };
	/** Called when auto-populate is enabled */
	onAutoPopulateEnabled?: () => void;
	/** Called when knowledge article is added */
	onKnowledgeAdded?: () => void;
	/** Called when auto-respond is enabled with context */
	onAutoRespondEnabled?: (
		ticketGroupName: string,
		automatedPercentage: number,
	) => void;
	/** Called when user wants to review knowledge */
	onReviewKnowledge?: () => void;
}

/**
 * ClusterDetailOverviewTab - Overview tab content for cluster detail sidebar
 *
 * Displays metrics, validation confidence progress, and AutoPilot recommendations
 */
export function ClusterDetailOverviewTab({
	clusterName = "Cluster",
	openTicketsCount = 0,
	kbStatus,
	reviewStats = { reviewed: 0, trusted: 0, total: 16 },
	onAutoPopulateEnabled,
	onKnowledgeAdded,
	onAutoRespondEnabled,
	onReviewKnowledge,
}: ClusterDetailOverviewTabProps) {
	const { t } = useTranslation("tickets");
	// Use mock AI response data (TODO: replace with real API)
	const aiResponse = MOCK_AI_RESPONSE;
	// Check if automation is enabled for this cluster (demo flow)
	const ticketsAutomated = useDemoStore((state) => state.ticketsAutomated);
	const isAutomationEnabled = ticketsAutomated > 0;
	const [enableModalOpen, setEnableModalOpen] = useState(false);
	const [autoPopulateSheetOpen, setAutoPopulateSheetOpen] = useState(false);
	const [selectedType, setSelectedType] = useState<AIResponseType | null>(null);
	const [createKnowledgeSheetOpen, setCreateKnowledgeSheetOpen] =
		useState(false);

	const handleEnableClick = (type: AIResponseType) => {
		setSelectedType(type);
		if (type === AI_RESPONSE_TYPE.AUTO_POPULATE) {
			setAutoPopulateSheetOpen(true);
		} else {
			setEnableModalOpen(true);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Metrics */}
			<AutomationMetricsCard />

			{/* Automation Readiness Meter */}
			<AutomationReadinessMeter
				reviewed={reviewStats.reviewed}
				total={reviewStats.total}
				hasKnowledge={kbStatus !== "GAP"}
				trustedPercentage={
					reviewStats.reviewed > 0
						? Math.round((reviewStats.trusted / reviewStats.reviewed) * 100)
						: 0
				}
				isAutomationEnabled={isAutomationEnabled}
				onEnableAutoRespond={() => {
					setSelectedType(AI_RESPONSE_TYPE.AUTO_RESPOND);
					setEnableModalOpen(true);
				}}
				onReviewKnowledge={onReviewKnowledge}
				onAddKnowledge={() => setCreateKnowledgeSheetOpen(true)}
			/>

			{/* AutoPilot Recommendations */}
			<AutoPilotRecommendations onEnableClick={handleEnableClick} />

			{/* Knowledge Gap Detected Card */}
			{kbStatus === "GAP" && (
				<RecommendationAlert
					title={t("knowledgeGap.title")}
					description={t("knowledgeGap.description")}
					icon={WandSparkles}
					buttonLabel={t("knowledgeGap.createArticle")}
					onButtonClick={() => setCreateKnowledgeSheetOpen(true)}
					variant="warning"
				/>
			)}

			{/* Enable Auto-Respond Modal */}
			{selectedType === AI_RESPONSE_TYPE.AUTO_RESPOND && (
				<EnableAutoRespondModal
					open={enableModalOpen}
					onOpenChange={setEnableModalOpen}
					ticketGroupName={clusterName}
					openTicketsCount={openTicketsCount}
					aiResponse={aiResponse}
					onAutoRespondEnabled={onAutoRespondEnabled}
				/>
			)}

			{/* Create Knowledge Article Sheet */}
			<CreateKnowledgeArticleSheet
				open={createKnowledgeSheetOpen}
				onOpenChange={setCreateKnowledgeSheetOpen}
				ticketGroupName={clusterName}
				onKnowledgeAdded={onKnowledgeAdded}
			/>

			{/* Enable Auto-Populate Sheet */}
			<EnableAutoPopulateSheet
				open={autoPopulateSheetOpen}
				onOpenChange={setAutoPopulateSheetOpen}
				onEnable={onAutoPopulateEnabled}
			/>
		</div>
	);
}
