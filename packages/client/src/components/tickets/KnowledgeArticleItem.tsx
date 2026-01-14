import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface KnowledgeArticleItemProps {
	/** Unique identifier for the article */
	id: string;
	/** File name to display */
	filename: string;
	/** File type label (e.g., "PDF", "Docx") */
	fileType: string;
	/** Formatted date string for display */
	createdAt: string;
	/** Called when download action is clicked */
	onDownload?: (id: string) => void;
	/** Called when reprocess action is clicked */
	onReprocess?: (id: string) => void;
	/** Called when delete action is clicked */
	onDelete?: (id: string) => void;
	/** Called when remove from group action is clicked */
	onRemoveFromGroup?: (id: string) => void;
}

/**
 * KnowledgeArticleItem - Displays a single knowledge article row
 *
 * Shows filename, file type, creation date, and a dropdown menu with actions.
 * Used in the KnowledgeTab to list KB articles linked to a cluster.
 *
 * @component
 */
export function KnowledgeArticleItem({
	id,
	filename,
	fileType,
	createdAt,
	onDownload,
	onReprocess,
	onDelete,
	onRemoveFromGroup,
}: KnowledgeArticleItemProps) {
	return (
		<div className="flex flex-row justify-between items-start w-full gap-2">
			<div className="flex flex-col justify-start items-start min-w-0 flex-1">
				<p className="text-sm truncate w-full">{filename}</p>
				<div className="flex flex-row gap-2 justify-start items-center">
					<span className="text-sm text-muted-foreground w-12">{fileType}</span>
					<span className="text-sm text-muted-foreground">{createdAt}</span>
				</div>
			</div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="flex-shrink-0">
						<MoreHorizontal className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => onDownload?.(id)}>
						Download
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onReprocess?.(id)}>
						Reprocess
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={() => onDelete?.(id)}
					>
						Delete
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onClick={() => onRemoveFromGroup?.(id)}
					>
						Remove from group
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
