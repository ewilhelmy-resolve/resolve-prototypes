import { Loader, Plus, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SOURCE_METADATA } from "@/constants/connectionSources";

interface SyncedSource {
	id: string;
	type: string;
}

interface AddKnowledgeMenuProps {
	/** Callback when "Upload file" is clicked */
	onUploadClick: () => void;
	/** Callback for navigation (e.g., to connections settings) */
	onNavigate: (path: string) => void;
	/** List of synced data source connections */
	syncedSources?: SyncedSource[];
	/** Whether a file upload is in progress */
	isUploading?: boolean;
	/** Number of files currently being uploaded */
	uploadingCount?: number;
}

export function AddKnowledgeMenu({
	onUploadClick,
	onNavigate,
	syncedSources = [],
	isUploading = false,
	uploadingCount = 0,
}: AddKnowledgeMenuProps) {
	const { t } = useTranslation("kbs");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button disabled={isUploading}>
					{isUploading ? (
						<Loader className="h-4 w-4 animate-spin" />
					) : (
						<Plus className="h-4 w-4" />
					)}
					{t("header.addButton")}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={onUploadClick} disabled={uploadingCount > 0}>
					{uploadingCount > 0 ? (
						<Loader className="h-4 w-4 mr-2 animate-spin" />
					) : (
						<Upload className="h-4 w-4 mr-2" />
					)}
					{uploadingCount > 0
						? t("dropdown.uploadingFiles", { count: uploadingCount })
						: t("dropdown.uploadFile")}
				</DropdownMenuItem>

				<DropdownMenuItem onClick={() => onNavigate("/settings/connections")}>
					<Plus className="h-4 w-4 mr-2" />
					{t("dropdown.connectSources")}
					<div className="ml-auto flex gap-1 pl-8">
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

				{syncedSources.length > 0 && (
					<>
						<DropdownMenuSeparator />
						{syncedSources.map((source) => (
							<DropdownMenuItem
								key={source.id}
								onClick={() => onNavigate(`/settings/connections/${source.id}`)}
							>
								<img
									src={`/connections/icon_${source.type}.svg`}
									alt=""
									className="h-4 w-4 mr-2"
								/>
								{SOURCE_METADATA[source.type]?.title || source.type}
							</DropdownMenuItem>
						))}
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
