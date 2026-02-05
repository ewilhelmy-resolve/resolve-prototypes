import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	getConfidenceColor,
	getConfidenceLabel,
	getAIResponseTypeConfig,
	type AIResponseType,
	AI_RESPONSE_TYPE,
} from "@/lib/tickets/utils";

/**
 * Knowledge base article reference
 */
export interface KBArticle {
	id: string;
	title: string;
}

/**
 * AI response data structure
 */
export interface AIResponseData {
	content: string;
	kbArticles: KBArticle[];
	confidenceScore: number; // 0-100
}

interface AIResponseSectionProps {
	/** AI response data to display */
	response: AIResponseData;
	/** AI response type (default: "auto-respond") */
	type?: AIResponseType;
	/** Optional custom class for the container */
	className?: string;
	/** Max KB articles to show before collapsing (default: 1) */
	maxVisibleArticles?: number;
}

/**
 * Reusable AI Response Section component
 *
 * Displays AI-generated response with:
 * - Type-specific badge (Auto-Respond, Auto-Populate, Auto-Resolve)
 * - Response content in monospace font
 * - KB article references (collapsible)
 * - Confidence score badge
 *
 * @component
 * @example
 * ```tsx
 * <AIResponseSection
 *   type={AI_RESPONSE_TYPE.AUTO_RESPOND}
 *   response={{
 *     content: "AI generated response...",
 *     kbArticles: [{ id: "KB001", title: "Article" }],
 *     confidenceScore: 92
 *   }}
 * />
 * ```
 */
export function AIResponseSection({
	response,
	type = AI_RESPONSE_TYPE.AUTO_RESPOND,
	className,
	maxVisibleArticles = 1,
}: AIResponseSectionProps) {
	const { t } = useTranslation("tickets");
	const typeConfig = getAIResponseTypeConfig(type);
	const TypeIcon = typeConfig.icon;
	const visibleArticles = response.kbArticles.slice(0, maxVisibleArticles);
	const hiddenCount = response.kbArticles.length - maxVisibleArticles;

	return (
		<div className={cn("flex-1 flex flex-col gap-2 min-h-0", className)}>
			{/* Header with label and badge */}
			<div className="flex items-center gap-2">
				<p className="text-sm text-foreground">{t("review.aiResponse")}</p>
				<Badge className={cn("px-2 py-0.5 border font-semibold gap-1", typeConfig.badgeClasses)}>
					<TypeIcon className="size-3" />
					{typeConfig.title}
				</Badge>
			</div>

			{/* Content area */}
			<div className="flex-1 flex flex-col gap-4 min-h-0">
				<div className="flex-1 bg-gray-50 border rounded-lg p-4 overflow-y-auto">
					<div className="flex flex-col gap-2">
						{/* Response content */}
						<p className="font-mono text-base whitespace-pre-wrap">
							{response.content}
						</p>

						{/* KB Articles & Confidence */}
						<div className="flex items-center gap-2 flex-wrap">
							{/* KB Articles */}
							{response.kbArticles.length > 0 && (
								<div className="flex items-center gap-2">
									{visibleArticles.map((article) => (
										<div
											key={article.id}
											className="flex items-center gap-4 md:gap-1 px-2.5 py-1 bg-white border rounded-md h-fit md:h-7"
										>
											<FileText className="size-12 md:size-3 text-muted-foreground" />
											<p className="text-sm">
												{article.id} - {article.title}
											</p>
										</div>
									))}
									{hiddenCount > 0 && (
										<div className="flex items-center px-2.5 py-1 bg-white border rounded-md h-7">
											<p className="text-sm">+{hiddenCount}</p>
										</div>
									)}
								</div>
							)}

							{/* Confidence Badge */}
							<Badge
								className={cn(
									"px-2 py-0.5 border border-transparent text-primary-foreground font-semibold",
									getConfidenceColor(response.confidenceScore)
								)}
							>
								{response.confidenceScore}% {getConfidenceLabel(response.confidenceScore)}
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default AIResponseSection;
