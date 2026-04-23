/**
 * UnlinkWorkflowModal - Confirmation for unlinking a workflow from another agent
 */

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

interface WorkflowToUnlink {
	id: string;
	name: string;
	linkedAgentName: string;
}

interface UnlinkWorkflowModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	workflow: WorkflowToUnlink | null;
	onConfirm: () => void;
}

export function UnlinkWorkflowModal({
	open,
	onOpenChange,
	workflow,
	onConfirm,
}: UnlinkWorkflowModalProps) {
	const { t } = useTranslation("agents");

	if (!workflow) return null;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>{t("unlinkWorkflowModal.title")}</AlertDialogTitle>
					<AlertDialogDescription>
						{t("unlinkWorkflowModal.description", {
							workflowName: workflow.name,
							agentName: workflow.linkedAgentName,
						})
							.split(/<strong>|<\/strong>/)
							.map((part, i) =>
								i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
							)}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
					<p className="text-sm text-amber-800">
						{t("unlinkWorkflowModal.warning")}
					</p>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel>
						{t("unlinkWorkflowModal.cancel")}
					</AlertDialogCancel>
					<Button onClick={onConfirm}>
						{t("unlinkWorkflowModal.unlinkAndAdd")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
