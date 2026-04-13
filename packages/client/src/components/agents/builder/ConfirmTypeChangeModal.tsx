/**
 * ConfirmTypeChangeModal - Double-confirmation for changing type on existing agents
 *
 * Shows current vs new type with destructive warning.
 */

import {
	AlertCircle,
	ArrowLeft,
	FileText,
	MessageSquare,
	Workflow,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENT_TYPE_INFO } from "@/constants/agents";
import type { AgentType } from "@/types/agent";

const TYPE_ICONS: Record<AgentType, React.ElementType> = {
	answer: MessageSquare,
	knowledge: FileText,
	workflow: Workflow,
};

interface ConfirmTypeChangeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentType: AgentType | null;
	pendingType: AgentType | null;
	agentName: string;
	onGoBack: () => void;
	onConfirm: () => void;
}

export function ConfirmTypeChangeModal({
	open,
	onOpenChange,
	currentType,
	pendingType,
	agentName,
	onGoBack,
	onConfirm,
}: ConfirmTypeChangeModalProps) {
	const { t } = useTranslation("agents");

	if (!pendingType) return null;

	const CurrentIcon = currentType ? TYPE_ICONS[currentType] : null;
	const PendingIcon = TYPE_ICONS[pendingType];

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="sm:max-w-md">
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-full bg-amber-100 flex items-center justify-center">
							<AlertCircle className="size-5 text-amber-600" />
						</div>
						<div>
							<AlertDialogTitle>
								{t("confirmTypeChangeModal.title")}
							</AlertDialogTitle>
							<p className="text-sm text-muted-foreground">
								{t("confirmTypeChangeModal.subtitle")}
							</p>
						</div>
					</div>
				</AlertDialogHeader>

				<div className="bg-muted/50 rounded-lg p-4 space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							{t("confirmTypeChangeModal.currentType")}
						</span>
						<Badge variant="secondary" className="gap-1">
							{CurrentIcon && <CurrentIcon className="size-3" />}
							{currentType && AGENT_TYPE_INFO[currentType].shortLabel}
						</Badge>
					</div>
					<div className="flex items-center justify-center">
						<ArrowLeft className="size-4 text-muted-foreground rotate-180" />
					</div>
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							{t("confirmTypeChangeModal.newType")}
						</span>
						<Badge variant="default" className="gap-1">
							<PendingIcon className="size-3" />
							{AGENT_TYPE_INFO[pendingType].shortLabel}
						</Badge>
					</div>
				</div>

				<div className="bg-red-50 border border-red-200 rounded-lg p-3">
					<p className="text-sm font-medium text-red-800 mb-1">
						{t("confirmTypeChangeModal.warning")}
					</p>
					<p className="text-sm text-red-700">
						{t("confirmTypeChangeModal.warningMessage", { agentName })
							.split(/<strong>|<\/strong>/)
							.map((part, i) =>
								i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
							)}
					</p>
				</div>

				<AlertDialogFooter>
					<Button variant="outline" onClick={onGoBack}>
						{t("confirmTypeChangeModal.goBack")}
					</Button>
					<Button variant="destructive" onClick={onConfirm}>
						{t("confirmTypeChangeModal.confirmChange")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
