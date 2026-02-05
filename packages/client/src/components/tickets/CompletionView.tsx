import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ReviewStats } from "./ReviewAIResponseSheet";
import {
	ReviewCompletionStats,
	type ReviewCompletionStatsRef,
} from "./ReviewCompletionStats";

interface CompletionViewProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	stats: ReviewStats;
	/** Whether this is the first review session for this cluster */
	isFirstSession?: boolean;
	/** Whether the cluster has knowledge articles */
	hasKnowledge?: boolean;
	onKeepReviewing?: () => void;
	/** Called when user clicks to add/review knowledge */
	onReviewKnowledge?: () => void;
	/** Called when user clicks to add knowledge (no knowledge scenario) */
	onAddKnowledge?: () => void;
	/** Called when user clicks to view automation readiness */
	onViewAutomationReadiness?: () => void;
}

/**
 * Completion screen shown after all tickets are reviewed
 * 
 * Features:
 * - Confetti celebration effect
 * - Review statistics display
 * - CTA for enabling Auto-Respond or continuing review
 * 
 * @component
 */
type ScenarioKey = "noKnowledge" | "firstGood" | "firstBad" | "subsequentGood" | "subsequentBad";

/**
 * Determine scenario key based on session state and results
 */
function getScenarioKey(
	stats: ReviewStats,
	isFirstSession: boolean,
	hasKnowledge: boolean
): { key: ScenarioKey; icon: string; showConfetti: boolean; primaryAction: "addKnowledge" | "reviewKnowledge" | "viewAutomationReadiness" | "keepReviewing" } {
	const isGoodResults = stats.trusted >= stats.totalReviewed / 2;

	if (!hasKnowledge) {
		return { key: "noKnowledge", icon: "⚠️", showConfetti: false, primaryAction: "addKnowledge" };
	}

	if (isFirstSession) {
		if (isGoodResults) {
			return { key: "firstGood", icon: "🎇", showConfetti: true, primaryAction: "keepReviewing" };
		}
		return { key: "firstBad", icon: "📚", showConfetti: false, primaryAction: "reviewKnowledge" };
	}

	if (isGoodResults) {
		return { key: "subsequentGood", icon: "🙌", showConfetti: true, primaryAction: "viewAutomationReadiness" };
	}

	return { key: "subsequentBad", icon: "🔧", showConfetti: false, primaryAction: "reviewKnowledge" };
}

export function CompletionView({
	open,
	onOpenChange,
	stats,
	isFirstSession = false,
	hasKnowledge = true,
	onKeepReviewing,
	onReviewKnowledge,
	onAddKnowledge,
	onViewAutomationReadiness,
}: CompletionViewProps) {
	const { t } = useTranslation("tickets");
	const confettiRef = useRef<ReviewCompletionStatsRef>(null);

	const scenario = getScenarioKey(stats, isFirstSession, hasKnowledge);

	const handleKeepReviewing = () => {
		onKeepReviewing?.();
		onOpenChange(false);
	};

	const handlePrimaryAction = () => {
		switch (scenario.primaryAction) {
			case "addKnowledge":
				onAddKnowledge?.();
				break;
			case "reviewKnowledge":
				onReviewKnowledge?.();
				break;
			case "viewAutomationReadiness":
				onViewAutomationReadiness?.();
				break;
			case "keepReviewing":
				onKeepReviewing?.();
				break;
		}
		onOpenChange(false);
	};

	// Get button labels based on scenario
	const getPrimaryButtonLabel = () => {
		switch (scenario.primaryAction) {
			case "addKnowledge":
				return t("completion.actions.addKnowledge");
			case "reviewKnowledge":
				return t("completion.actions.reviewKnowledge");
			case "viewAutomationReadiness":
				return t("completion.actions.viewAutomationReadiness");
			case "keepReviewing":
				return t("completion.actions.keepReviewing");
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className="flex flex-col gap-6 sm:max-w-2xl w-full p-8"
				aria-describedby={undefined}
			>
				{/* Hidden but accessible header for screen readers */}
				<SheetHeader className="sr-only">
					<SheetTitle>{t("completion.title")}</SheetTitle>
				</SheetHeader>

				{/* Content */}
				<ReviewCompletionStats
					ref={confettiRef}
					icon={scenario.icon}
					title={t(`completion.scenarios.${scenario.key}.title`)}
					subtitle={t(`completion.scenarios.${scenario.key}.subtitle`)}
					trusted={stats.trusted}
					totalReviewed={stats.totalReviewed}
					needsImprovement={stats.needsImprovement}
					message={t(`completion.scenarios.${scenario.key}.message`)}
					proTip={t(`completion.scenarios.${scenario.key}.proTip`)}
					showConfetti={scenario.showConfetti}
					className="flex-1"
				/>

				{/* Footer Actions */}
				<SheetFooter className="flex-row justify-end gap-2">
					{scenario.primaryAction !== "keepReviewing" && (
						<Button variant="outline" onClick={handlePrimaryAction}>
							{getPrimaryButtonLabel()}
						</Button>
					)}
					<Button onClick={handleKeepReviewing}>
						{t("completion.actions.keepReviewing")}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
