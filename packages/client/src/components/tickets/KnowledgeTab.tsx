import { Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClusterKbArticles } from "@/hooks/useClusters";

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
	const { data: kbArticles, isLoading, error } = useClusterKbArticles(clusterId);

	// Action handlers - currently log to console, will be replaced with API calls
	const handleDownload = (id: string, filename: string) => {
		console.log(`Download: ${filename} (${id})`);
		// TODO: Implement file download
	};

	const handleReprocess = (id: string, filename: string) => {
		console.log(`Reprocess: ${filename} (${id})`);
		// TODO: Implement reprocess API call
	};

	const handleDelete = (id: string, filename: string) => {
		console.log(`Delete: ${filename} (${id})`);
		// TODO: Implement delete API call
	};

	const handleRemoveFromGroup = (id: string, filename: string) => {
		console.log(`Remove from group: ${filename} (${id})`);
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
				<p className="text-sm text-destructive">Failed to load KB articles</p>
			</div>
		);
	}

	if (!kbArticles || kbArticles.length === 0) {
		return (
			<div className="flex min-h-[100px] items-center justify-center">
				<p className="text-sm text-muted-foreground">No knowledge articles linked</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				{kbArticles.map((item, index) => (
					<div key={item.id}>
						<div className="flex flex-col gap-3">
							<div className="flex flex-row justify-start items-start w-full">
								<div className="flex flex-col justify-start items-start min-w-0 flex-1">
									<div className="flex flex-row justify-start items-start w-full">
										<div className="flex flex-col justify-start items-start min-w-0 flex-1">
											<p className="text-sm truncate">{item.filename}</p>
											<div className="flex flex-row gap-2 justify-start items-start">
												<span className="text-sm text-muted-foreground w-12 max-w-12">
													{getFileType(item.mime_type)}
												</span>
												<span className="text-sm text-muted-foreground">
													{formatDate(item.created_at)}
												</span>
											</div>
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreHorizontal />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleDownload(item.id, item.filename)}>
													Download
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleReprocess(item.id, item.filename)}>
													Reprocess
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													variant="destructive"
													onClick={() => handleDelete(item.id, item.filename)}
												>
													Delete
												</DropdownMenuItem>
												<DropdownMenuItem
													variant="destructive"
													onClick={() => handleRemoveFromGroup(item.id, item.filename)}
												>
													Remove from group
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							</div>
						</div>
						{index < kbArticles.length - 1 && <Separator />}
					</div>
				))}
			</div>
		</div>
	);
}
