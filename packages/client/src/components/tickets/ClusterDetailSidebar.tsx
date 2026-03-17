import { FileText, Loader2, Plus, Upload, WandSparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ritaToast } from "@/components/ui/rita-toast";
import { useUploadFile } from "@/hooks/api/useFiles";
import { useClusterKbArticles, useLinkKbArticle } from "@/hooks/useClusters";
import {
	SUPPORTED_DOCUMENT_TYPES,
	validateFileForUpload,
} from "@/lib/constants";
import type { KBStatus } from "@/types/cluster";
import { CreateKnowledgeArticleSheet } from "./CreateKnowledgeArticleSheet";
import { RecommendationAlert } from "./RecommendationAlert";

interface ClusterDetailSidebarProps {
	/** Cluster ID from URL params */
	clusterId?: string;
	/** Cluster display name */
	clusterName?: string;
	/** Number of KB articles from cluster details */
	kbArticlesCount?: number;
	/** Knowledge base status from cluster API */
	kbStatus?: KBStatus;
	/** Called when knowledge article is added */
	onKnowledgeAdded?: () => void;
}

/**
 * ClusterDetailSidebar - Right sidebar for cluster detail page
 *
 * Shows knowledge article list and "+ Add knowledge" CTA.
 * GAP clusters: RecommendationAlert CTA to generate via sheet.
 */
export function ClusterDetailSidebar({
	clusterId,
	clusterName = "Cluster",
	kbArticlesCount = 0,
	kbStatus,
	onKnowledgeAdded,
}: ClusterDetailSidebarProps) {
	const { t } = useTranslation(["tickets", "toast", "kbs"]);
	const navigate = useNavigate();
	const [createSheetOpen, setCreateSheetOpen] = useState(false);
	const { data: kbArticles, isLoading } = useClusterKbArticles(clusterId);
	const uploadFileMutation = useUploadFile();
	const linkKbArticleMutation = useLinkKbArticle(clusterId);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);

	// Optimistic local articles added via the KA generator
	const [localArticles, setLocalArticles] = useState<string[]>([]);

	const hasArticleList = kbArticles && kbArticles.length > 0;
	const hasKnowledge =
		hasArticleList || kbArticlesCount > 0 || localArticles.length > 0;

	// After generating knowledge, hide GAP CTA
	const effectiveKbStatus = localArticles.length > 0 ? "FOUND" : kbStatus;

	const handleKnowledgeGenerated = (content: string) => {
		const titleMatch = content.match(/^#\s+(.+)/m);
		const title = titleMatch?.[1] || `${clusterName} Knowledge Article`;
		setLocalArticles((prev) => [...prev, title]);
	};

	const handleSheetKnowledgeAdded = () => {
		onKnowledgeAdded?.();
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setIsUploading(true);
		const filesToUpload = Array.from(files);
		let successCount = 0;

		for (const file of filesToUpload) {
			const validation = validateFileForUpload(file);
			if (!validation.isValid && validation.errorCode) {
				ritaToast.error({
					title: t("toast:error.uploadFailed"),
					description: `${file.name}: ${t(`kbs:errors.${validation.errorCode}.description`, validation.errorParams)}`,
				});
				continue;
			}

			try {
				// Upload file
				const response = await uploadFileMutation.mutateAsync(file);
				// Link to cluster
				await linkKbArticleMutation.mutateAsync(response.document.id);
				successCount++;
			} catch (error: any) {
				if (error.status === 409) {
					ritaToast.warning({
						title: file.name,
						description: "File already exists or is already linked",
					});
				} else {
					ritaToast.error({
						title: t("toast:error.uploadFailed"),
						description: `${file.name}: ${error.message || "Upload failed"}`,
					});
				}
			}
		}

		setIsUploading(false);

		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}

		if (successCount > 0) {
			onKnowledgeAdded?.();
			ritaToast.success({
				title: t("toast:success.filesUploaded"),
				description: t("toast:descriptions.uploadedProcessing", {
					count: successCount,
				}),
			});
		}
	};

	return (
		<div className="w-full border-t p-4 lg:w-80 lg:shrink-0 lg:border-l lg:border-t-0">
			<div className="flex flex-col gap-4">
				{/* Section label */}
				<span className="text-sm text-muted-foreground">
					{clusterName} knowledge
				</span>

				{/* Bordered card */}
				<div className="rounded-lg border bg-card">
					{isLoading ? (
						<div className="flex items-center justify-center py-6">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="flex flex-col">
							{/* API-loaded articles */}
							{hasArticleList &&
								kbArticles.map((article) => (
									<div
										key={article.id}
										className="flex items-center gap-3 px-4 py-3"
									>
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50">
											<FileText className="h-3.5 w-3.5 text-blue-600" />
										</div>
										<span className="truncate text-sm">{article.filename}</span>
									</div>
								))}

							{/* Fallback: count-based rows when API returns empty but count > 0 */}
							{!hasArticleList &&
								kbArticlesCount > 0 &&
								Array.from({ length: kbArticlesCount }, (_, i) => (
									<div
										key={`count-${i}`}
										className="flex items-center gap-3 px-4 py-3"
									>
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50">
											<FileText className="h-3.5 w-3.5 text-blue-600" />
										</div>
										<span className="text-sm text-muted-foreground">
											Knowledge article {i + 1}
										</span>
									</div>
								))}

							{/* Optimistically added articles */}
							{localArticles.map((title, i) => (
								<div
									key={`local-${i}`}
									className="flex items-center gap-3 px-4 py-3"
								>
									<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50">
										<FileText className="h-3.5 w-3.5 text-blue-600" />
									</div>
									<span className="truncate text-sm">{title}</span>
								</div>
							))}

							{/* Upload in progress */}
							{isUploading && (
								<div className="flex items-center gap-3 px-4 py-3">
									<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										Uploading...
									</span>
								</div>
							)}

							{/* Empty state */}
							{!hasKnowledge && !isUploading && (
								<p className="px-4 py-3 text-sm text-muted-foreground">
									{t("tickets:knowledge.noArticles")}
								</p>
							)}
						</div>
					)}

					{/* + Add knowledge */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="flex w-full items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<Plus className="h-4 w-4" />
								Add knowledge
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							{effectiveKbStatus === "GAP" && (
								<DropdownMenuItem onClick={() => setCreateSheetOpen(true)}>
									<WandSparkles className="h-4 w-4 mr-2" />
									Generate article
								</DropdownMenuItem>
							)}
							<DropdownMenuItem onClick={handleUploadClick}>
								<Upload className="h-4 w-4 mr-2" />
								Upload file
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => navigate("/settings/connections")}
							>
								<Plus className="h-4 w-4 mr-2" />
								Connect sources
								<div className="ml-auto flex gap-1 pl-4">
									<img
										src="/connections/icon_confluence.svg"
										alt=""
										className="h-4 w-4"
									/>
									<img
										src="/connections/icon_sharepoint.svg"
										alt=""
										className="h-4 w-4"
									/>
									<img
										src="/connections/icon_servicenow.svg"
										alt=""
										className="h-4 w-4"
									/>
								</div>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Knowledge gap CTA — hidden after article is generated */}
				{effectiveKbStatus === "GAP" && (
					<RecommendationAlert
						title={t("tickets:knowledgeGap.title")}
						description={t("tickets:knowledgeGap.description")}
						icon={WandSparkles}
						buttonLabel={t("tickets:knowledgeGap.createArticle")}
						onButtonClick={() => setCreateSheetOpen(true)}
						variant="warning"
					/>
				)}
			</div>

			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				onChange={handleFileChange}
				accept={SUPPORTED_DOCUMENT_TYPES}
				disabled={isUploading}
			/>

			<CreateKnowledgeArticleSheet
				open={createSheetOpen}
				onOpenChange={setCreateSheetOpen}
				ticketGroupName={clusterName}
				onAddKnowledge={handleKnowledgeGenerated}
				onKnowledgeAdded={handleSheetKnowledgeAdded}
			/>
		</div>
	);
}
