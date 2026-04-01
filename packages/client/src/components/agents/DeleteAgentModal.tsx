/**
 * DeleteAgentModal - Confirmation modal for deleting agents
 *
 * Two tiers:
 * - Draft/Disabled: Simple confirmation
 * - Published: Type-to-confirm with impact list and warning
 *
 * Uses AlertDialog for proper accessibility (focus trap, aria-modal, Escape key).
 */

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import type { AgentImpact, AgentStatus } from "@/types/agent";

interface DeleteAgentModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agentName: string;
	agentStatus: AgentStatus;
	impact?: AgentImpact;
	onConfirmDelete: () => void;
}

export function DeleteAgentModal({
	open,
	onOpenChange,
	agentName,
	agentStatus,
	impact,
	onConfirmDelete,
}: DeleteAgentModalProps) {
	const [confirmText, setConfirmText] = useState("");

	const isPublished = agentStatus === "published";
	const canDelete = isPublished ? confirmText.toLowerCase() === "delete" : true;

	const handleDelete = () => {
		if (!canDelete) return;
		onConfirmDelete();
		onOpenChange(false);
		setConfirmText("");
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setConfirmText("");
		}
		onOpenChange(newOpen);
	};

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent className="sm:max-w-sm">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete {agentName}?</AlertDialogTitle>
					<AlertDialogDescription className="sr-only">
						Confirm deletion of agent {agentName}
					</AlertDialogDescription>
				</AlertDialogHeader>

				{/* What will be removed */}
				<div className="bg-neutral-50 rounded-md px-2 py-2">
					<div className="flex flex-col gap-2">
						<p className="text-sm font-bold text-foreground leading-none h-[18px] flex items-end">
							What will be removed
						</p>
						<ul className="text-sm text-foreground list-disc ml-[21px] space-y-0.5">
							{impact?.skills && impact.skills > 0 && (
								<li>
									{impact.skills} skill{impact.skills > 1 ? "s" : ""}
								</li>
							)}
							{impact?.conversationStarters &&
								impact.conversationStarters > 0 && (
									<li>
										{impact.conversationStarters} conversation starter
										{impact.conversationStarters > 1 ? "s" : ""}
									</li>
								)}
							<li>Usage history & analytics</li>
						</ul>
					</div>
				</div>

				{/* Warning for published agents */}
				{isPublished && (
					<div className="bg-yellow-50 border border-yellow-500 rounded-md p-2 flex flex-col gap-1">
						<div className="flex items-center gap-1">
							<AlertTriangle className="size-6 text-yellow-600 shrink-0" />
							<p className="text-sm font-bold text-foreground leading-7">
								Warning
							</p>
						</div>
						<p className="text-sm text-muted-foreground leading-5">
							Once removed, this agent will no longer be accessible to help
							employees. This action cannot be undone.
						</p>
					</div>
				)}

				{!isPublished && (
					<p className="text-sm text-muted-foreground leading-5">
						This draft will be permanently removed. This action cannot be
						undone.
					</p>
				)}

				{/* Type to confirm for published agents */}
				{isPublished && (
					<div className="flex flex-col gap-2">
						<p className="text-sm text-foreground leading-none">
							Type &quot;delete&quot; to confirm
						</p>
						<Input
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							placeholder="delete"
							className="h-9 text-sm"
							autoComplete="off"
						/>
					</div>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={!canDelete}
					>
						Delete agent
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
