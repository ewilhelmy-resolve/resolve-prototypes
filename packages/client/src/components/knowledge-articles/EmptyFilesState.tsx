import { File, Plus } from "lucide-react";
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
	return (
		<div className="bg-background flex flex-col items-center w-full">
			<div className="p-6 border border-border rounded-lg flex flex-col items-center gap-6 w-full">
				<File className="w-12 h-12 text-foreground opacity-30" />

				<div className="flex flex-col items-center gap-2">
					<h2 className="text-xl font-normal text-foreground text-center leading-7">
						{hasActiveFilters ? "No articles found" : "No articles yet"}
					</h2>
					<p className="text-sm text-muted-foreground text-center">
						{hasActiveFilters
							? "Try adjusting your search or filter criteria"
							: "Upload your knowledge articles to unlock instant answers from RITA"}
					</p>
				</div>

				{!hasActiveFilters && onUploadClick && (
					<div className="flex justify-center items-center gap-3">
						<div className="space-y-4">
							<div className="text-center">
								<Button variant={"secondary"} onClick={onUploadClick} className="shadow-sm">
									<Plus className="h-4 w-4" />
									Add Article
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
