import { useState } from "react";
import { WandSparkles } from "lucide-react";
import {
	AI_RESPONSE_TYPE,
	MOCK_AI_RESPONSE,
	type AIResponseType,
} from "@/lib/tickets/utils";
import { EnableAutoRespondModal } from "./EnableAutoRespondModal";
import { EnableAutoPopulateSheet } from "./EnableAutoPopulateSheet";
import { CreateKnowledgeArticleSheet } from "./CreateKnowledgeArticleSheet";
import { AutomationMetricsCard } from "./AutomationMetricsCard";
import { AutoPilotRecommendations } from "./AutoPilotRecommendations";
import { RecommendationAlert } from "./RecommendationAlert";
import { ValidationConfidenceCard } from "./ValidationConfidenceCard";
import type { KBStatus } from "@/types/cluster";

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
	onAutoRespondEnabled?: (ticketGroupName: string, automatedPercentage: number) => void;
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
}: ClusterDetailOverviewTabProps) {
	// Use mock AI response data (TODO: replace with real API)
	const aiResponse = MOCK_AI_RESPONSE;
	const [enableModalOpen, setEnableModalOpen] = useState(false);
	const [autoPopulateSheetOpen, setAutoPopulateSheetOpen] = useState(false);
	const [selectedType, setSelectedType] = useState<AIResponseType | null>(null);
	const [createKnowledgeSheetOpen, setCreateKnowledgeSheetOpen] = useState(false);

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

			{/* Validation Confidence */}
			<ValidationConfidenceCard />

			{/* AutoPilot Recommendations */}
			<AutoPilotRecommendations onEnableClick={handleEnableClick} />

			{/* Knowledge Gap Detected Card */}
			{kbStatus === "GAP" && (
				<RecommendationAlert
					title="Knowledge Gap Detected"
					description="No knowledge articles found for this cluster. Rita recommends creating one to enable Auto-Answer."
					icon={WandSparkles}
					buttonLabel="Create Knowledge Article"
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
