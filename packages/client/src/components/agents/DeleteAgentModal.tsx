/**
 * DeleteAgentModal - Confirmation modal for deleting agents
 *
 * Two tiers:
 * - Draft: Simple confirmation
 * - Published: Type-to-confirm with impact list and warning
 */

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AgentImpact {
	skills?: number;
	conversationStarters?: number;
	usersThisWeek?: number;
	linkedWorkflows?: string[];
}

interface DeleteAgentModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agentName: string;
	agentStatus: "draft" | "published";
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

	const handleClose = () => {
		onOpenChange(false);
		setConfirmText("");
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-black/50"
				onClick={handleClose}
				onKeyDown={(e) => e.key === "Escape" && handleClose()}
			/>

			<div className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-sm p-6 flex flex-col gap-4">
				<button
					type="button"
					onClick={handleClose}
					className="absolute top-[15px] right-[15px] opacity-70 hover:opacity-100"
					aria-label="Close"
				>
					<X className="size-4" />
				</button>

				{/* Header */}
				<p className="text-lg font-semibold leading-none text-foreground">
					Delete {agentName}?
				</p>

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

				{/* Warning */}
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

				{/* Type to confirm */}
				{isPublished && (
					<div className="flex flex-col gap-2">
						<p className="text-sm text-foreground leading-none">
							Type "delete" to confirm
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

				{/* Footer */}
				<div className="flex items-center justify-end gap-2">
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={!canDelete}
						className={cn(!canDelete && "opacity-50 cursor-not-allowed")}
					>
						Delete agent
					</Button>
				</div>
			</div>
		</div>
	);
}
