/**
 * UnlinkWorkflowModal - Confirmation for unlinking a workflow from another agent
 */

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
	if (!workflow) return null;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>Unlink Workflow</AlertDialogTitle>
					<AlertDialogDescription>
						<strong>{workflow.name}</strong> is currently linked to{" "}
						<strong>{workflow.linkedAgentName}</strong>.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
					<p className="text-sm text-amber-800">
						Unlinking this workflow will remove it from the other agent. Each
						workflow can only be connected to one agent at a time.
					</p>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<Button onClick={onConfirm}>Unlink & Add</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
