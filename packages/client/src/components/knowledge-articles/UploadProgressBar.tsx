import { Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";

interface UploadProgressBarProps {
	/** Number of files uploaded so far */
	current: number;
	/** Total number of files to upload */
	total: number;
}

export function UploadProgressBar({ current, total }: UploadProgressBarProps) {
	const { t } = useTranslation("kbs");
	const percentage = total > 0 ? (current / total) * 100 : 0;

	return (
		<div className="flex items-center gap-4 p-4 bg-muted/50 border rounded-md">
			<Loader className="h-4 w-4 animate-spin text-primary" />
			<div className="flex-1">
				<div className="flex justify-between text-sm mb-1">
					<span>{t("uploadProgress.uploading")}</span>
					<span>{t("uploadProgress.progress", { current, total })}</span>
				</div>
				<Progress value={percentage} className="h-2" />
			</div>
		</div>
	);
}
