import { File, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FileUploadRequirements } from "./FileUploadRequirements";

interface EmptyFilesStateProps {
	/** Whether there are active filters (search or status filter) */
	hasActiveFilters?: boolean;
	/** Callback when "Upload Document" button is clicked */
	onUploadClick?: () => void;
}

export default function EmptyFilesState({
	hasActiveFilters = false,
	onUploadClick,
}: EmptyFilesStateProps) {
	const { t } = useTranslation("kbs");

	return (
		<div className="bg-background flex flex-col items-center w-full">
			<div className="p-6 border border-border rounded-lg flex flex-col items-center gap-6 w-full">
				<File className="w-12 h-12 text-foreground opacity-30" />

				<div className="flex flex-col items-center gap-2">
					<h2 className="text-xl font-normal text-foreground text-center leading-7">
						{hasActiveFilters ? t("empty.noArticlesFound") : t("empty.noArticlesYet")}
					</h2>
					<p className="text-sm text-muted-foreground text-center">
						{hasActiveFilters
							? t("empty.adjustFilters")
							: t("empty.uploadPrompt")}
					</p>
				</div>

				{!hasActiveFilters && onUploadClick && (
					<div className="flex justify-center items-center gap-3">
						<div className="space-y-4">
							<div className="text-center">
								<Button variant={"secondary"} onClick={onUploadClick} className="shadow-sm">
									<Plus className="h-4 w-4" />
									{t("empty.addArticle")}
								</Button>
							</div>
							<div>
								<FileUploadRequirements />
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
