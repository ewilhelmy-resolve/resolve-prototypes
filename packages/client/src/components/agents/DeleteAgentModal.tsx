/**
 * DeleteAgentModal - Confirmation modal for deleting agents
 *
 * Two tiers:
 * - Draft/Disabled: Simple confirmation
 * - Published: Type-to-confirm with impact list, active dependencies warning
 */

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	const { t } = useTranslation("agents");
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

	const hasActiveDependencies =
		(impact?.usersThisWeek != null && impact.usersThisWeek > 0) ||
		(impact?.linkedWorkflows != null && impact.linkedWorkflows.length > 0);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-start gap-3">
						<div className="flex items-center justify-center size-10 rounded-full bg-red-100 shrink-0">
							<Trash2 className="size-5 text-destructive" />
						</div>
						<div className="flex flex-col gap-0.5">
							<DialogTitle className="text-lg font-semibold leading-snug">
								{t("deleteModal.title", { agentName })}
							</DialogTitle>
							<DialogDescription>
								{isPublished
									? t("deleteModal.descriptionPublished")
									: t("deleteModal.descriptionDraft")}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{/* Published agents: full impact details */}
				{isPublished && (
					<>
						{/* What will be removed */}
						<div className="bg-neutral-50 rounded-md px-4 py-3">
							<p className="text-sm font-semibold text-foreground mb-2">
								{t("deleteModal.whatWillBeRemoved")}
							</p>
							<ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
								<li>{t("deleteModal.configuration")}</li>
								{impact?.skills != null && impact.skills > 0 && (
									<li>
										{t("deleteModal.connectedSkills", {
											count: impact.skills,
										})}
									</li>
								)}
								{impact?.conversationStarters != null &&
									impact.conversationStarters > 0 && (
										<li>
											{t("deleteModal.conversationStarters", {
												count: impact.conversationStarters,
											})}
										</li>
									)}
								<li>{t("deleteModal.usageHistory")}</li>
							</ul>
						</div>

						{/* Active dependencies warning */}
						{hasActiveDependencies && (
							<div className="bg-yellow-50 border border-yellow-300 rounded-md px-4 py-3">
								<div className="flex items-center gap-1.5 mb-1">
									<AlertTriangle className="size-4 text-yellow-600 shrink-0" />
									<p className="text-sm font-semibold text-yellow-700">
										{t("deleteModal.activeDependencies")}
									</p>
								</div>
								<div className="text-sm text-yellow-700 ml-[22px] space-y-0.5">
									{impact?.usersThisWeek != null &&
										impact.usersThisWeek > 0 && (
											<p>
												{t("deleteModal.usedByEmployees", {
													count: impact.usersThisWeek,
												})}
											</p>
										)}
									{impact?.linkedWorkflows?.map((workflow) => (
										<p key={workflow}>
											{t("deleteModal.linkedToWorkflow", { workflow })}
										</p>
									))}
								</div>
							</div>
						)}

						{/* Type to confirm */}
						<div className="flex flex-col gap-2">
							<p className="text-sm text-foreground">
								{t("deleteModal.typeToConfirm", {
									interpolation: { escapeValue: false },
								})
									.split(/<bold>|<\/bold>/)
									.map((part, i) =>
										i % 2 === 1 ? (
											<span key={i} className="font-semibold">
												{part}
											</span>
										) : (
											part
										),
									)}
							</p>
							<Input
								value={confirmText}
								onChange={(e) => setConfirmText(e.target.value)}
								placeholder={t("deleteModal.confirmPlaceholder")}
								className="h-9 text-sm"
								autoComplete="off"
								aria-label={t("deleteModal.confirmLabel")}
							/>
						</div>
					</>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						{t("deleteModal.cancel")}
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={!canDelete}
					>
						{isPublished
							? t("deleteModal.deleteAgent")
							: t("deleteModal.deleteDraft")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
