import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export type ReadinessState = "ready" | "partial" | "low" | "not-ready";

interface AutomationReadinessMeterProps {
	/** Number of reviewed responses */
	reviewed: number;
	/** Total responses to review */
	total: number;
	/** Whether knowledge exists for this cluster */
	hasKnowledge: boolean;
	/** Percentage of trusted/positive reviews (0-100) */
	trustedPercentage: number;
	/** Called when Enable Auto-Respond button clicked */
	onEnableAutoRespond?: () => void;
	/** Called when Review knowledge button clicked */
	onReviewKnowledge?: () => void;
	/** Called when Add knowledge button clicked */
	onAddKnowledge?: () => void;
	/** Optional className */
	className?: string;
}

const STATE_CONFIG: Record<
	ReadinessState,
	{
		label: string;
		bgColor: string;
		textColor: string;
		borderColor: string;
	}
> = {
	ready: {
		label: "Ready",
		bgColor: "bg-green-100",
		textColor: "text-green-800",
		borderColor: "border-green-500",
	},
	partial: {
		label: "Partial",
		bgColor: "bg-orange-100",
		textColor: "text-orange-800",
		borderColor: "border-orange-400",
	},
	low: {
		label: "Low",
		bgColor: "bg-yellow-100",
		textColor: "text-yellow-800",
		borderColor: "border-yellow-400",
	},
	"not-ready": {
		label: "Not ready",
		bgColor: "bg-gray-100",
		textColor: "text-gray-800",
		borderColor: "border-gray-300",
	},
};

function getReadinessState(
	hasKnowledge: boolean,
	trustedPercentage: number,
): ReadinessState {
	if (!hasKnowledge) return "not-ready";
	if (trustedPercentage >= 80) return "ready";
	if (trustedPercentage >= 50) return "partial";
	return "low";
}

function getDescription(state: ReadinessState): string {
	switch (state) {
		case "ready":
			return "Reviewed responses consistently met expectations.";
		case "partial":
			return "Based on reviewed responses, some replies still need improvement before automation is recommended.";
		case "low":
			return "Based on reviewed responses, several replies need clearer or more complete knowledge";
		case "not-ready":
			return "Automation can't be recommended yet because no knowledge exists for this cluster.";
	}
}

function getRecommendation(hasKnowledge: boolean, reviewed: number): string {
	if (!hasKnowledge && reviewed === 0) {
		return "Create knowledge to enable automation";
	}
	if (!hasKnowledge) {
		return "Add knowledge to enhance automation";
	}
	return "Continue manual review";
}

/**
 * AutomationReadinessMeter - Shows automation readiness state based on review metrics
 *
 * States:
 * - Ready (green): ≥80% trusted reviews, has knowledge
 * - Partial (orange): 50-79% trusted reviews, has knowledge
 * - Low (yellow): <50% trusted reviews, has knowledge
 * - Not ready (gray): no knowledge exists
 */
export function AutomationReadinessMeter({
	reviewed,
	total,
	hasKnowledge,
	trustedPercentage,
	onEnableAutoRespond,
	onReviewKnowledge,
	onAddKnowledge,
	className,
}: AutomationReadinessMeterProps) {
	const state = getReadinessState(hasKnowledge, trustedPercentage);
	const config = STATE_CONFIG[state];
	const description = getDescription(state);
	const recommendation = getRecommendation(hasKnowledge, reviewed);

	const showReviewCount = hasKnowledge || reviewed > 0;

	return (
		<div className={className}>
			<div
				className={`rounded-lg border-2 ${config.borderColor} bg-background p-4`}
			>
				<div className="flex flex-col gap-3">
					{/* Header */}
					<div className="flex items-start justify-between">
						<h3 className="text-sm font-semibold">Automation readiness is</h3>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="text-muted-foreground hover:text-foreground"
									aria-label="More information about automation readiness"
								>
									<Info className="h-4 w-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-xs">
								<p>
									Automation readiness is calculated based on the percentage of
									reviewed responses that met expectations.
								</p>
							</TooltipContent>
						</Tooltip>
					</div>

					{/* Status Badge */}
					<Badge
						className={`${config.bgColor} ${config.textColor} border-transparent font-semibold`}
					>
						{config.label}
					</Badge>

					{/* Description */}
					<p className="text-sm text-foreground">{description}</p>

					{/* Review Count */}
					{showReviewCount ? (
						<p className="text-sm text-muted-foreground">
							Based on {reviewed} of {total} responses reviewed
						</p>
					) : (
						<p className="text-sm text-muted-foreground">
							No responses reviewed yet
						</p>
					)}

					{/* Recommendation */}
					<div>
						<p className="text-base text-muted-foreground">Recommendation</p>
						<p className="text-sm font-medium">{recommendation}</p>
					</div>

					{/* Action Button */}
					<div>
						{state === "ready" && (
							<Button variant="outline" size="sm" onClick={onEnableAutoRespond}>
								Enable Auto-Respond
							</Button>
						)}
						{(state === "partial" || state === "low") && (
							<Button variant="outline" size="sm" onClick={onReviewKnowledge}>
								Review knowledge
							</Button>
						)}
						{state === "not-ready" && (
							<Button variant="outline" size="sm" onClick={onAddKnowledge}>
								Add knowledge
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
