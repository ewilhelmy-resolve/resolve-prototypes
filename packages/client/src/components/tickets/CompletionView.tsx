import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
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
/**
 * Determine scenario content based on session state and results
 */
function getScenarioContent(
	stats: ReviewStats,
	isFirstSession: boolean,
	hasKnowledge: boolean
) {
	const isGoodResults = stats.trusted >= stats.totalReviewed / 2;

	// No Knowledge scenario (any session, any results)
	if (!hasKnowledge) {
		return {
			icon: "⚠️",
			title: "Nice start, knowledge missing",
			subtitle: "You've started reviewing AI responses for this cluster. Missing knowledge is likely impacting response quality.",
			message: "Without knowledge, AI responses may lack the context needed to meet expectations.",
			proTip: "Early reviews help identify the most important gaps to address when creating knowledge.",
			showConfetti: false,
			primaryAction: "addKnowledge" as const,
		};
	}

	// First session scenarios
	if (isFirstSession) {
		if (isGoodResults) {
			return {
				icon: "🎇",
				title: "Nice start, early signs look good",
				subtitle: "You've started reviewing AI responses for this cluster. Early feedback suggests responses are meeting expectations.",
				message: "Responses reviewed so far generally met expectations.",
				proTip: "Continued review helps confirm patterns across more tickets.",
				showConfetti: true,
				primaryAction: "keepReviewing" as const,
			};
		}
		return {
			icon: "📚",
			title: "Nice start, still learning",
			subtitle: "You've started reviewing AI responses for this cluster. Based on this session, some responses did not meet expectations.",
			message: "Some reviewed responses lacked the information needed to meet expectations.",
			proTip: "Reviewing a few more tickets helps surface patterns and edge cases faster.",
			showConfetti: false,
			primaryAction: "reviewKnowledge" as const,
		};
	}

	// Subsequent session scenarios
	if (isGoodResults) {
		return {
			icon: "🙌",
			title: "Responses look aligned",
			subtitle: "AI responses reviewed in this session consistently met expectations.",
			message: "Reviewed responses matched expected answers for this cluster.",
			proTip: "Consistent results contribute to automation readiness over time.",
			showConfetti: true,
			primaryAction: "viewAutomationReadiness" as const,
		};
	}

	return {
		icon: "🔧",
		title: "Responses need improvement",
		subtitle: "Most AI responses reviewed in this session did not meet expectations.",
		message: "Several responses lacked the information needed to respond accurately.",
		proTip: "Improving knowledge coverage often has the biggest impact on response quality.",
		showConfetti: false,
		primaryAction: "reviewKnowledge" as const,
	};
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
	const confettiRef = useRef<ReviewCompletionStatsRef>(null);

	const scenario = getScenarioContent(stats, isFirstSession, hasKnowledge);

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
				return "Add knowledge";
			case "reviewKnowledge":
				return "Review knowledge";
			case "viewAutomationReadiness":
				return "View automation readiness";
			case "keepReviewing":
				return "Keep reviewing";
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
					<SheetTitle>Review Complete</SheetTitle>
				</SheetHeader>

				{/* Content */}
				<ReviewCompletionStats
					ref={confettiRef}
					icon={scenario.icon}
					title={scenario.title}
					subtitle={scenario.subtitle}
					trusted={stats.trusted}
					totalReviewed={stats.totalReviewed}
					needsImprovement={stats.needsImprovement}
					message={scenario.message}
					proTip={scenario.proTip}
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
						Keep reviewing
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
