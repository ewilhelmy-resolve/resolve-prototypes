import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConfidenceColor, getConfidenceLabel } from "@/lib/tickets/utils";

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
	/** Optional label override (default: "AI-Response") */
	label?: string;
	/** Optional badge text override (default: "Auto-Respond") */
	badgeText?: string;
	/** Optional custom class for the container */
	className?: string;
	/** Max KB articles to show before collapsing (default: 1) */
	maxVisibleArticles?: number;
}

/**
 * Reusable AI Response Section component
 *
 * Displays AI-generated response with:
 * - Auto-respond badge indicator
 * - Response content in monospace font
 * - KB article references (collapsible)
 * - Confidence score badge
 *
 * @component
 * @example
 * ```tsx
 * <AIResponseSection
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
	label = "AI-Response",
	badgeText = "Auto-Respond",
	className,
	maxVisibleArticles = 1,
}: AIResponseSectionProps) {
	const visibleArticles = response.kbArticles.slice(0, maxVisibleArticles);
	const hiddenCount = response.kbArticles.length - maxVisibleArticles;

	return (
		<div className={cn("flex-1 flex flex-col gap-2 min-h-0", className)}>
			{/* Header with label and badge */}
			<div className="flex items-center gap-2">
				<p className="text-sm text-foreground">{label}</p>
				<Badge className="px-2 py-0.5 border border-purple-500 bg-purple-50 text-purple-500 font-semibold gap-1">
					<Sparkles className="size-3" />
					{badgeText}
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
											className="flex items-center gap-1 px-2.5 py-1 bg-white border rounded-md h-7"
										>
											<FileText className="size-3 text-muted-foreground" />
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
