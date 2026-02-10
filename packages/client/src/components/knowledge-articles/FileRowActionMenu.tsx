import { Download, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileDocument } from "@/hooks/api/useFiles";
import { FILE_SOURCE, FILE_STATUS } from "@/lib/constants";

interface FileRowActionMenuProps {
	/** The file document for this row */
	file: FileDocument;
	/** Callback to download the file */
	onDownload: (file: FileDocument) => void;
	/** Callback to reprocess the file */
	onReprocess: (file: FileDocument) => void;
	/** Callback to delete the file */
	onDelete: (file: FileDocument) => void;
	/** Whether a reprocess operation is in progress */
	isReprocessing?: boolean;
	/** Whether a delete operation is in progress */
	isDeleting?: boolean;
}

export function FileRowActionMenu({
	file,
	onDownload,
	onReprocess,
	onDelete,
	isReprocessing = false,
	isDeleting = false,
}: FileRowActionMenuProps) {
	const { t } = useTranslation("kbs");

	const isManual = file.source === FILE_SOURCE.MANUAL;
	const canDownload =
		isManual &&
		(file.status === FILE_STATUS.UPLOADED ||
			file.status === FILE_STATUS.PROCESSED);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground hover:text-foreground"
				>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{canDownload && (
					<DropdownMenuItem onClick={() => onDownload(file)}>
						<Download className="h-4 w-4 mr-2" />
						{t("actions.download")}
					</DropdownMenuItem>
				)}
				{isManual && (
					<DropdownMenuItem
						onClick={() => onReprocess(file)}
						disabled={isReprocessing}
					>
						<RefreshCw
							className={`h-4 w-4 mr-2 ${isReprocessing ? "animate-spin" : ""}`}
						/>
						{t("actions.reprocess")}
					</DropdownMenuItem>
				)}
				<DropdownMenuItem
					onClick={() => onDelete(file)}
					disabled={isDeleting}
					variant="destructive"
				>
					<Trash2 className="h-4 w-4 mr-2" />
					{t("actions.delete")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
