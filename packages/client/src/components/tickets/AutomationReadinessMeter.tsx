import { Info, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ReadinessState =
	| "ready"
	| "partial"
	| "low"
	| "not-ready"
	| "coming-soon";

interface AutomationReadinessMeterProps {
	/** Number of reviewed responses */
	reviewed: number;
	/** Total responses to review */
	total: number;
	/** Whether knowledge exists for this cluster */
	hasKnowledge: boolean;
	/** Percentage of trusted/positive reviews (0-100) */
	trustedPercentage: number;
	/** Force a specific state (overrides calculated state) */
	forceState?: ReadinessState;
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
		labelKey:
			| "automation.meterStates.ready"
			| "automation.meterStates.partial"
			| "automation.meterStates.low"
			| "automation.meterStates.notReady"
			| "automation.meterStates.comingSoon";
		descriptionKey:
			| "automation.descriptions.ready"
			| "automation.descriptions.partial"
			| "automation.descriptions.low"
			| "automation.descriptions.notReady"
			| "automation.descriptions.comingSoon";
		bgColor: string;
		textColor: string;
		borderColor: string;
	}
> = {
	ready: {
		labelKey: "automation.meterStates.ready",
		descriptionKey: "automation.descriptions.ready",
		bgColor: "bg-green-100",
		textColor: "text-green-800",
		borderColor: "border-green-500 border-l-4",
	},
	partial: {
		labelKey: "automation.meterStates.partial",
		descriptionKey: "automation.descriptions.partial",
		bgColor: "bg-orange-100",
		textColor: "text-orange-800",
		borderColor: "border-orange-400 border-l-4",
	},
	low: {
		labelKey: "automation.meterStates.low",
		descriptionKey: "automation.descriptions.low",
		bgColor: "bg-yellow-100",
		textColor: "text-yellow-800",
		borderColor: "border-yellow-400 border-l-4",
	},
	"not-ready": {
		labelKey: "automation.meterStates.notReady",
		descriptionKey: "automation.descriptions.notReady",
		bgColor: "bg-gray-100",
		textColor: "text-gray-800",
		borderColor: "border-gray-300 border-l-4",
	},
	"coming-soon": {
		labelKey: "automation.meterStates.comingSoon",
		descriptionKey: "automation.descriptions.comingSoon",
		bgColor: "bg-blue-100",
		textColor: "text-blue-800",
		borderColor: "border-gray-200 border-l-4",
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

function getRecommendationKey(
	hasKnowledge: boolean,
	reviewed: number,
):
	| "automation.recommendations.createKnowledge"
	| "automation.recommendations.addKnowledge"
	| "automation.recommendations.continueReview" {
	if (!hasKnowledge && reviewed === 0) {
		return "automation.recommendations.createKnowledge";
	}
	if (!hasKnowledge) {
		return "automation.recommendations.addKnowledge";
	}
	return "automation.recommendations.continueReview";
}

/**
 * AutomationReadinessMeter - Shows automation readiness state based on review metrics
 *
 * States:
 * - Ready (green): ≥80% trusted reviews, has knowledge
 * - Partial (orange): 50-79% trusted reviews, has knowledge
 * - Low (yellow): <50% trusted reviews, has knowledge
 * - Not ready (gray): no knowledge exists
 * - Coming soon (blue): data not yet available
 */
export function AutomationReadinessMeter({
	reviewed,
	total,
	hasKnowledge,
	trustedPercentage,
	forceState,
	onEnableAutoRespond,
	onReviewKnowledge,
	onAddKnowledge,
	className,
}: AutomationReadinessMeterProps) {
	const { t } = useTranslation("tickets");
	const state =
		forceState ?? getReadinessState(hasKnowledge, trustedPercentage);
	const config = STATE_CONFIG[state];
	const description = t(config.descriptionKey);
	const recommendation = t(getRecommendationKey(hasKnowledge, reviewed));

	const isComingSoon = state === "coming-soon";
	const showReviewCount = !isComingSoon && (hasKnowledge || reviewed > 0);

	return (
		<Card className={`${config.borderColor} gap-0 py-0 ${className ?? ""}`}>
			<CardContent
				className={cn(
					"flex flex-col gap-3 p-4",
					isComingSoon && "bg-sidebar-primary-foreground",
				)}
			>
				{isComingSoon ? (
					<div className="text-center">
						{/* Coming Soon: Badge first, then title */}
						<Badge
							className={`${config.bgColor} ${config.textColor} border-transparent font-semibold`}
						>
							<Sparkles className="mr-1 h-3 w-3" />
							<span className="text-black">{t(config.labelKey)}</span>
						</Badge>
						<h3 className="text-sm font-semibold">
							{t("readiness.titleComingSoon")}
						</h3>
					</div>
				) : (
					<>
						{/* Normal: Header with tooltip, then badge */}
						<div className="flex items-start justify-between">
							<h3 className="text-sm font-semibold">{t("readiness.title")}</h3>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										className="text-muted-foreground hover:text-foreground"
										aria-label={t("readiness.tooltip")}
									>
										<Info className="h-4 w-4" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="left" className="max-w-xs">
									<p>{t("readiness.tooltip")}</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<Badge
							className={`${config.bgColor} ${config.textColor} border-transparent font-semibold`}
						>
							{t(config.labelKey)}
						</Badge>
					</>
				)}

				{/* Description */}
				<p className="text-sm text-foreground">{description}</p>

				{/* Review Count */}
				{!isComingSoon &&
					(showReviewCount ? (
						<p className="text-sm text-muted-foreground">
							{t("readiness.reviewedOf", { reviewed, total })}
						</p>
					) : (
						<p className="text-sm text-muted-foreground">
							{t("readiness.noReviews")}
						</p>
					))}

				{/* Recommendation */}
				{!isComingSoon && (
					<div>
						<p className="text-base text-muted-foreground">
							{t("readiness.recommendation")}
						</p>
						<p className="text-sm font-medium">{recommendation}</p>
					</div>
				)}

				{/* Action Button */}
				{!isComingSoon && (
					<div>
						{state === "ready" && (
							<Button variant="outline" size="sm" onClick={onEnableAutoRespond}>
								{t("readiness.buttons.enableAutoRespond")}
							</Button>
						)}
						{(state === "partial" || state === "low") && (
							<Button variant="outline" size="sm" onClick={onReviewKnowledge}>
								{t("readiness.buttons.reviewKnowledge")}
							</Button>
						)}
						{state === "not-ready" && (
							<Button variant="outline" size="sm" onClick={onAddKnowledge}>
								{t("readiness.buttons.addKnowledge")}
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
