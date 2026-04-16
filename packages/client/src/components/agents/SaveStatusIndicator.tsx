/**
 * SaveStatusIndicator - Visual feedback for auto-save status
 *
 * Shows: Draft → Saving... → Saved ✓ → Draft
 */

import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";

interface SaveStatusIndicatorProps {
	status: SaveStatus;
	isDirty: boolean;
	error?: string | null;
	className?: string;
}

export function SaveStatusIndicator({
	status,
	isDirty,
	error,
	className,
}: SaveStatusIndicatorProps) {
	const { t } = useTranslation("agents");

	const getStatusDisplay = () => {
		switch (status) {
			case "saving":
				return {
					icon: <Loader2 className="size-3.5 animate-spin" />,
					text: t("saveStatus.saving"),
					className: "text-muted-foreground",
				};
			case "saved":
				return {
					icon: <Check className="size-3.5" />,
					text: t("saveStatus.saved"),
					className: "text-emerald-600",
				};
			case "error":
				return {
					icon: <CloudOff className="size-3.5" />,
					text: error || t("saveStatus.error"),
					className: "text-destructive",
				};
			default:
				// idle
				return {
					icon: <Cloud className="size-3.5" />,
					text: isDirty
						? t("saveStatus.unsavedChanges")
						: t("saveStatus.draft"),
					className: isDirty ? "text-amber-600" : "text-muted-foreground",
				};
		}
	};

	const { icon, text, className: statusClassName } = getStatusDisplay();

	return (
		<output
			className={cn(
				"flex items-center gap-1.5 text-xs font-medium transition-colors",
				statusClassName,
				className,
			)}
		>
			{icon}
			<span>{text}</span>
		</output>
	);
}
