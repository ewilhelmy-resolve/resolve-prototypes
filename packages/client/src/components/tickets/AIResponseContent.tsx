import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Knowledge base article reference
 */
export interface KBArticle {
	id: string;
	title: string;
}

interface AIResponseContentProps {
	content: string;
	kbArticles: KBArticle[];
	confidenceScore: number; // 0-100
	className?: string;
}

/**
 * Component displaying AI-generated response content
 *
 * Features:
 * - Formatted response text with monospace font
 * - Knowledge base article references
 * - Confidence score badge
 * - Scrollable content area
 *
 * @component
 */
export default function AIResponseContent({
	content,
	kbArticles,
	confidenceScore,
	className,
}: AIResponseContentProps) {
	const getConfidenceColor = (score: number) => {
		if (score >= 90) return "bg-teal-500";
		if (score >= 75) return "bg-green-500";
		if (score >= 60) return "bg-yellow-500";
		return "bg-orange-500";
	};

	return (
		<div
			className={cn(
				"bg-gray-50 border rounded-lg p-4 overflow-y-auto",
				className
			)}
		>
			<div className="flex flex-col gap-2">
				<p className="font-mono text-base whitespace-pre-wrap">{content}</p>

				{/* KB Articles & Confidence */}
				<div className="flex items-center gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						{kbArticles.slice(0, 1).map((article) => (
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
						{kbArticles.length > 1 && (
							<div className="flex items-center px-2.5 py-1 bg-white border rounded-md h-7">
								<p className="text-sm">+{kbArticles.length - 1}</p>
							</div>
						)}
					</div>
					<Badge
						className={cn(
							"px-2 py-0.5 border border-transparent text-primary-foreground font-semibold",
							getConfidenceColor(confidenceScore)
						)}
					>
						{confidenceScore}% strong
					</Badge>
				</div>
			</div>
		</div>
	);
}
