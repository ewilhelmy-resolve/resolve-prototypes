/**
 * PublishModal - Confirmation modal for publishing an agent
 *
 * Shows agent preview card with stats before publishing.
 */

import { Squirrel } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AVAILABLE_ICONS, ICON_COLORS } from "@/constants/agents";
import { cn } from "@/lib/utils";
import type { AgentConfig } from "@/types/agent";

interface PublishModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	config: AgentConfig;
	onConfirm: () => void;
}

export function PublishModal({
	open,
	onOpenChange,
	config,
	onConfirm,
}: PublishModalProps) {
	const { t } = useTranslation("agents");
	const iconColor = ICON_COLORS.find((c) => c.id === config.iconColorId);
	const iconData = AVAILABLE_ICONS.find((i) => i.id === config.iconId);
	const IconComponent = (iconData?.icon || Squirrel) as React.ElementType;
	const colorClass = iconColor?.text || "text-white";

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="sm:max-w-sm">
				<AlertDialogHeader>
					<AlertDialogTitle>{t("publishModal.title")}</AlertDialogTitle>
					<AlertDialogDescription>
						{t("publishModal.description")}
					</AlertDialogDescription>
				</AlertDialogHeader>

				{/* Agent card */}
				<div className="bg-neutral-50 rounded-md px-2 py-2">
					<div className="flex gap-2.5 items-start">
						<div
							className={cn(
								"size-[38px] rounded-lg flex items-center justify-center shrink-0 overflow-clip p-2",
								iconColor?.bg || "bg-violet-200",
							)}
						>
							<IconComponent className={cn("size-6", colorClass)} />
						</div>
						<div className="flex-1 min-w-0 flex flex-col gap-2.5">
							<div className="flex flex-col pb-0.5">
								<p className="text-base font-bold text-foreground truncate leading-[22px]">
									{config.name}
								</p>
								<p className="text-xs text-foreground leading-none">
									{config.description}
								</p>
							</div>
							{config.workflows.length > 0 && (
								<div className="flex items-center justify-between text-sm text-foreground leading-none h-[18px]">
									<span>{t("publishModal.skills")}</span>
									<span className="text-right">{config.workflows.length}</span>
								</div>
							)}
							{config.knowledgeSources.length > 0 && (
								<div className="flex items-center justify-between text-sm text-foreground leading-none h-[18px]">
									<span>{t("publishModal.knowledgeSources")}</span>
									<span className="text-right">
										{config.knowledgeSources.length}
									</span>
								</div>
							)}
							{config.guardrails.length > 0 && (
								<div className="flex items-center justify-between text-sm text-foreground leading-none h-[18px]">
									<span>{t("publishModal.guardrails")}</span>
									<span className="text-right">{config.guardrails.length}</span>
								</div>
							)}
						</div>
					</div>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel>{t("publishModal.cancel")}</AlertDialogCancel>
					<Button onClick={onConfirm}>{t("publishModal.publish")}</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
