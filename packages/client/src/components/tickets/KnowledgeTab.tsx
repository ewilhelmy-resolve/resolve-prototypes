import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { useClusterKbArticles } from "@/hooks/useClusters";
import { KnowledgeArticleItem } from "./KnowledgeArticleItem";

interface KnowledgeTabProps {
	/** Cluster ID to fetch KB articles for */
	clusterId?: string;
}

// Get file type from mime_type
const getFileType = (mimeType: string): string => {
	if (mimeType.includes("pdf")) return "PDF";
	if (mimeType.includes("word") || mimeType.includes("doc")) return "Docx";
	if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Excel";
	if (mimeType.includes("text")) return "Text";
	return "File";
};

// Format date for display
const formatDate = (dateString: string): string => {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
};

/**
 * KnowledgeTab - Knowledge articles tab content for ticket detail sidebar
 *
 * Displays a list of knowledge articles linked to the cluster
 */
export default function KnowledgeTab({ clusterId }: KnowledgeTabProps) {
	const { t } = useTranslation("tickets");
	const { data: kbArticles, isLoading, error } = useClusterKbArticles(clusterId);

	// Action handlers - currently log to console, will be replaced with API calls
	const handleDownload = (id: string) => {
		const article = kbArticles?.find((a) => a.id === id);
		console.log(`Download: ${article?.filename} (${id})`);
		// TODO: Implement file download
	};

	const handleReprocess = (id: string) => {
		const article = kbArticles?.find((a) => a.id === id);
		console.log(`Reprocess: ${article?.filename} (${id})`);
		// TODO: Implement reprocess API call
	};

	const handleDelete = (id: string) => {
		const article = kbArticles?.find((a) => a.id === id);
		console.log(`Delete: ${article?.filename} (${id})`);
		// TODO: Implement delete API call
	};

	const handleRemoveFromGroup = (id: string) => {
		const article = kbArticles?.find((a) => a.id === id);
		console.log(`Remove from group: ${article?.filename} (${id})`);
		// TODO: Implement remove from cluster API call
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[100px] items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[100px] items-center justify-center">
				<p className="text-sm text-destructive">{t("knowledge.failedToLoad")}</p>
			</div>
		);
	}

	if (!kbArticles || kbArticles.length === 0) {
		return (
			<div className="flex min-h-[100px] items-center justify-center">
				<p className="text-sm text-muted-foreground">{t("knowledge.noArticles")}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				{kbArticles.map((item, index) => (
					<div key={item.id}>
						<KnowledgeArticleItem
							id={item.id}
							filename={item.filename}
							fileType={getFileType(item.mime_type)}
							createdAt={formatDate(item.created_at)}
							onDownload={handleDownload}
							onReprocess={handleReprocess}
							onDelete={handleDelete}
							onRemoveFromGroup={handleRemoveFromGroup}
						/>
						{index < kbArticles.length - 1 && <Separator className="mt-3" />}
					</div>
				))}
			</div>
		</div>
	);
}
