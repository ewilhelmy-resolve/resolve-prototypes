import {
	AlertCircle,
	Check,
	Copy,
	Plus,
	RefreshCw,
	WandSparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddKbArticle, useGenerateKnowledge } from "@/hooks/useClusters";
import { copyToClipboard } from "@/lib/utils";
import { useKnowledgeGenerationStore } from "@/stores/knowledgeGenerationStore";

interface KnowledgeSource {
	id: string;
	label: string;
	description: string;
	checked: boolean;
}

interface CreateKnowledgeArticleSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Cluster ID for the generation API call */
	clusterId?: string;
	/** Ticket group name for context */
	ticketGroupName?: string;
	/** Number of historical tickets available for this cluster */
	historicalTicketCount?: number;
	/** Called when user clicks "Add knowledge" with the content */
	onAddKnowledge?: (content: string) => void;
	/** Called after knowledge is successfully added (for showing banners etc) */
	onKnowledgeAdded?: () => void;
}

const INITIAL_SOURCES: KnowledgeSource[] = [
	{
		id: "historical-tickets",
		label: "Historical Tickets",
		description: "Use past ticket resolutions and patterns from this cluster",
		checked: true,
	},
	{
		id: "web-search",
		label: "Web Search",
		description:
			"Include relevant information from web sources and documentation",
		checked: true,
	},
];

const GENERATION_TIMEOUT_MS = 60_000;

/**
 * Sheet component for creating knowledge articles from ticket patterns
 *
 * Features:
 * - Knowledge source selection (checkboxes)
 * - Generate article via backend webhook + RabbitMQ + SSE
 * - AI-generated article preview with loading skeleton
 * - Error state with inline alert and retry
 * - Copy and Add knowledge actions
 *
 * @component
 */
export function CreateKnowledgeArticleSheet({
	open,
	onOpenChange,
	clusterId,
	ticketGroupName = "Software Installation",
	historicalTicketCount = 0,
	onAddKnowledge,
	onKnowledgeAdded,
}: CreateKnowledgeArticleSheetProps) {
	const { t } = useTranslation("tickets");
	const hasHistoricalTickets = historicalTicketCount > 0;
	const [sources, setSources] = useState<KnowledgeSource[]>(() =>
		INITIAL_SOURCES.map((s) =>
			s.id === "historical-tickets"
				? { ...s, checked: hasHistoricalTickets }
				: s,
		),
	);
	const [generatedArticle, setGeneratedArticle] = useState<string>("");
	const [isCopied, setIsCopied] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const store = useKnowledgeGenerationStore();
	const generateMutation = useGenerateKnowledge(clusterId ?? "");
	const addKbArticleMutation = useAddKbArticle(clusterId ?? "");

	const isGenerating = store.status === "generating";
	const isError = store.status === "error";
	const isSuccess = store.status === "success";

	// Sync store content to local textarea state on success
	useEffect(() => {
		if (isSuccess && store.content) {
			setGeneratedArticle(store.content);
		}
	}, [isSuccess, store.content]);

	// Clean up timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const handleSourceToggle = (sourceId: string) => {
		setSources((prev) =>
			prev.map((source) =>
				source.id === sourceId
					? { ...source, checked: !source.checked }
					: source,
			),
		);
	};

	const handleGenerateArticle = async () => {
		if (!clusterId) return;

		// Clear previous error state before retrying
		store.reset();

		const selectedSources = sources.filter((s) => s.checked).map((s) => s.id);

		try {
			const result = await generateMutation.mutateAsync(selectedSources);
			store.startGeneration(result.generation_id);

			// Start timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = setTimeout(() => {
				const current = useKnowledgeGenerationStore.getState();
				if (current.status === "generating") {
					current.timeout();
				}
			}, GENERATION_TIMEOUT_MS);
		} catch (_error) {
			store.receiveError(
				"Failed to start article generation. Please try again.",
			);
		}
	};

	const handleCopy = async () => {
		await copyToClipboard(generatedArticle);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleAddKnowledge = async () => {
		if (!clusterId || !generatedArticle) return;

		setSaveError(null);

		const filename =
			store.filename ||
			generatedArticle
				.match(/^#\s+(.+)$/m)?.[1]
				?.trim()
				.replace(/[^a-zA-Z0-9-_ ]/g, "")
				.replace(/\s+/g, "-")
				.toLowerCase()
				.concat(".md") ||
			"knowledge-article.md";

		try {
			await addKbArticleMutation.mutateAsync({
				content: generatedArticle,
				filename,
			});
			onAddKnowledge?.(generatedArticle);
			onKnowledgeAdded?.();
			onOpenChange(false);
			resetState();
		} catch (_error) {
			setSaveError("Failed to add knowledge article. Please try again.");
		}
	};

	const resetState = () => {
		setGeneratedArticle("");
		setSources(
			INITIAL_SOURCES.map((s) =>
				s.id === "historical-tickets"
					? { ...s, checked: hasHistoricalTickets }
					: s,
			),
		);
		setIsCopied(false);
		setSaveError(null);
		store.reset();
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	};

	const handleCancel = () => {
		onOpenChange(false);
		resetState();
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			resetState();
		}
		onOpenChange(nextOpen);
	};

	const hasSelectedSources = sources.some((s) => s.checked);
	const showArticlePreview = isSuccess && generatedArticle;

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="flex flex-col gap-6 sm:max-w-xl w-full p-8 overflow-hidden">
				<SheetHeader className="p-0 flex-shrink-0">
					<SheetTitle className="text-lg font-semibold">
						Create Knowledge Article
					</SheetTitle>
					<SheetDescription className="text-sm text-muted-foreground">
						Generate a knowledge article for "{ticketGroupName}" to enable
						automation
					</SheetDescription>
				</SheetHeader>

				{/* Scrollable Content Area */}
				<div className="flex-1 flex flex-col gap-6 overflow-y-auto overflow-x-hidden min-h-0">
					{/* Knowledge Sources Section */}
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-semibold">Knowledge Sources</h3>
							<p className="text-sm text-muted-foreground">
								Select sources to generate comprehensive article
							</p>
						</div>

						<div className="flex flex-col gap-2">
							{sources.map((source) => {
								const isSourceDisabled =
									source.id === "historical-tickets" && !hasHistoricalTickets;
								return (
									<label
										key={source.id}
										htmlFor={source.id}
										className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
											isSourceDisabled
												? "opacity-50 cursor-not-allowed"
												: "cursor-pointer hover:bg-accent/50"
										}`}
									>
										<Checkbox
											id={source.id}
											checked={source.checked}
											onCheckedChange={() =>
												!isSourceDisabled && handleSourceToggle(source.id)
											}
											disabled={isGenerating || isSourceDisabled}
											className="mt-0.5"
											aria-label={`Include ${source.label} as a knowledge source`}
										/>
										<div className="flex flex-col gap-0.5">
											<span className="text-sm font-medium">
												{source.label}
											</span>
											<span className="text-sm text-muted-foreground">
												{isSourceDisabled
													? t(
															"createKnowledge.sources.historicalTicketsDisabled",
														)
													: source.id === "historical-tickets"
														? t("createKnowledge.sources.historicalTickets")
														: t("createKnowledge.sources.webSearch")}
											</span>
										</div>
									</label>
								);
							})}
						</div>
					</div>

					{/* Generate Article Button */}
					<Button
						variant="outline"
						className="w-full gap-2"
						onClick={handleGenerateArticle}
						disabled={
							isGenerating ||
							!hasSelectedSources ||
							!clusterId ||
							generateMutation.isPending
						}
						aria-label="Generate knowledge article from selected sources"
					>
						<WandSparkles className="h-4 w-4" />
						{isGenerating || generateMutation.isPending
							? "Generating..."
							: "Generate Article"}
					</Button>

					{/* Generating State - Loading Skeleton */}
					{isGenerating && (
						<output
							className="flex flex-col gap-3 flex-1 min-h-[200px] p-4 rounded-md border border-input bg-gray-50"
							aria-label="Generating article"
						>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<RefreshCw className="h-4 w-4 animate-spin" />
								<span>Generating article from selected sources...</span>
							</div>
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-4 w-2/3" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-4/5" />
						</output>
					)}

					{/* Error State - Inline Alert */}
					{isError && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Generation failed</AlertTitle>
							<AlertDescription className="flex flex-col gap-2">
								<span>{store.error}</span>
								<Button
									variant="outline"
									size="sm"
									className="w-fit gap-2"
									onClick={handleGenerateArticle}
									disabled={!hasSelectedSources || !clusterId}
									aria-label="Retry article generation"
								>
									<RefreshCw className="h-3.5 w-3.5" />
									Retry
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{/* AI-Message Section - Success State */}
					{showArticlePreview && (
						<div className="flex flex-col gap-2 flex-1 min-h-[200px] p-2 md:p-0">
							<label htmlFor="ai-message" className="text-sm font-medium">
								AI-Message
							</label>
							<textarea
								id="ai-message"
								value={generatedArticle}
								onChange={(e) => setGeneratedArticle(e.target.value)}
								className="flex-1 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								aria-label="Generated knowledge article content"
							/>
						</div>
					)}
				</div>

				{/* Save Error Alert */}
				{saveError && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Save failed</AlertTitle>
						<AlertDescription>{saveError}</AlertDescription>
					</Alert>
				)}

				{/* Footer Actions */}
				<SheetFooter className="flex-row justify-end gap-2 flex-shrink-0 p-0">
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					{showArticlePreview && (
						<>
							<Button
								variant="outline"
								className="gap-2"
								onClick={handleCopy}
								aria-label={
									isCopied ? "Copied to clipboard" : "Copy article to clipboard"
								}
							>
								{isCopied ? (
									<Check className="h-4 w-4 text-primary" />
								) : (
									<Copy className="h-4 w-4" />
								)}
								{isCopied ? "Copied!" : "Copy"}
							</Button>
							<Button
								className="gap-2"
								onClick={handleAddKnowledge}
								disabled={addKbArticleMutation.isPending}
								aria-label="Add knowledge article"
							>
								<Plus className="h-4 w-4" />
								{addKbArticleMutation.isPending ? "Adding..." : "Add knowledge"}
							</Button>
						</>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export default CreateKnowledgeArticleSheet;
