import { WandSparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AI_RESPONSE_TYPE, type AIResponseType } from "@/lib/tickets/utils";
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
	onAutoPopulateEnabled,
	onKnowledgeAdded,
	onAutoRespondEnabled,
	onReviewKnowledge,
}: ClusterDetailOverviewTabProps) {
	const { t } = useTranslation("tickets");
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
				reviewed={0}
				total={16}
				hasKnowledge={kbStatus !== "GAP"}
				trustedPercentage={0}
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
