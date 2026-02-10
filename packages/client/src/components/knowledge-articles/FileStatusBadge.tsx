import {
	AlertCircle,
	Check,
	CheckCircle,
	Loader,
	RefreshCw,
	Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FILE_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_ICON_REGISTRY: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	[FILE_STATUS.UPLOADED]: Check,
	[FILE_STATUS.PROCESSING]: Loader,
	[FILE_STATUS.PROCESSED]: CheckCircle,
	[FILE_STATUS.FAILED]: AlertCircle,
	[FILE_STATUS.PENDING]: Loader,
	[FILE_STATUS.SYNCING]: Zap,
};

const STATUS_ICON_ANIMATIONS: Record<string, string> = {
	[FILE_STATUS.PROCESSING]: "animate-spin",
	[FILE_STATUS.PENDING]: "animate-spin",
};

function getStatusVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case FILE_STATUS.PROCESSED:
			return "default";
		case FILE_STATUS.PROCESSING:
			return "secondary";
		case FILE_STATUS.FAILED:
			return "destructive";
		default:
			return "outline";
	}
}

function getStatusLabel(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

interface FileStatusBadgeProps {
	/** File processing status */
	status: string;
	/** Callback when retry button is clicked (only shown for failed status) */
	onRetry?: () => void;
	/** Whether a retry operation is in progress */
	isRetrying?: boolean;
}

export function FileStatusBadge({
	status,
	onRetry,
	isRetrying = false,
}: FileStatusBadgeProps) {
	const { t } = useTranslation("kbs");
	const IconComponent = STATUS_ICON_REGISTRY[status] || AlertCircle;
	const animation = STATUS_ICON_ANIMATIONS[status] || "";

	return (
		<div className="flex items-center gap-2">
			<Badge
				variant={getStatusVariant(status)}
				className="flex items-center gap-1 w-fit"
			>
				<IconComponent className={`h-3 w-3 ${animation}`.trim()} />
				{getStatusLabel(status)}
			</Badge>
			{status === FILE_STATUS.FAILED && onRetry && (
				<Button
					variant="link"
					size="sm"
					onClick={onRetry}
					disabled={isRetrying}
					className="h-7 px-2 gap-1.5 hover:no-underline"
				>
					<RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
					<span className="text-xs">{t("actions.retry")}</span>
				</Button>
			)}
		</div>
	);
}
