/**
 * ChangeAgentTypeModal - Modal for changing an agent's type
 *
 * Shows radio selection for answer/knowledge/workflow with impact warnings.
 */

import { BookOpen, MessageSquare, Workflow } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AGENT_TYPE_INFO } from "@/constants/agents";
import { cn } from "@/lib/utils";
import type { AgentType } from "@/types/agent";

interface ChangeAgentTypeModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentType: AgentType | null;
	knowledgeSourcesCount: number;
	toolsCount: number;
	isEditing: boolean;
	onConfirm: (newType: AgentType, needsDoubleConfirm: boolean) => void;
}

const TYPE_ICONS: Record<AgentType, React.ElementType> = {
	answer: MessageSquare,
	knowledge: BookOpen,
	workflow: Workflow,
};

export function ChangeAgentTypeModal({
	open,
	onOpenChange,
	currentType,
	knowledgeSourcesCount,
	toolsCount,
	isEditing,
	onConfirm,
}: ChangeAgentTypeModalProps) {
	const { t } = useTranslation("agents");
	const [pendingType, setPendingType] = useState<AgentType | null>(null);

	const handleClose = () => {
		onOpenChange(false);
		setPendingType(null);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md" showCloseButton>
				<h2 id="change-agent-type-title" className="text-lg font-medium">
					{t("changeTypeModal.title")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("changeTypeModal.description")}
				</p>

				<div
					role="radiogroup"
					aria-labelledby="change-agent-type-title"
					className="space-y-2"
				>
					{(["answer", "knowledge", "workflow"] as const).map((type) => {
						const typeInfo = AGENT_TYPE_INFO[type];
						const TypeIcon = TYPE_ICONS[type];
						return (
							<label
								key={type}
								className={cn(
									"flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
									pendingType === type
										? "border-primary ring-1 ring-primary bg-white"
										: "border-muted bg-white hover:border-muted-foreground/30",
								)}
							>
								<input
									type="radio"
									name="change-agent-type"
									checked={pendingType === type}
									onChange={() => setPendingType(type)}
									className="mt-1.5"
								/>
								<div
									className={cn(
										"size-10 rounded-lg flex items-center justify-center flex-shrink-0",
										typeInfo.iconBg,
									)}
								>
									<TypeIcon className={cn("size-5", typeInfo.iconColor)} />
								</div>
								<div className="flex-1 min-w-0">
									<span className="font-medium">{typeInfo.label}</span>
									<p className="text-sm text-muted-foreground mt-0.5">
										{typeInfo.shortDesc}
									</p>
								</div>
							</label>
						);
					})}
				</div>

				{/* Impact warning */}
				{pendingType && pendingType !== currentType && (
					<output
						aria-live="polite"
						className="block bg-amber-50 border border-amber-200 rounded-lg p-3"
					>
						<p className="text-sm font-medium text-amber-800 mb-2">
							{t("changeTypeModal.whatWillChange")}
						</p>
						<ul className="text-sm text-amber-700 space-y-1">
							{pendingType === "workflow" && knowledgeSourcesCount > 0 && (
								<li>
									&bull;{" "}
									{t("changeTypeModal.knowledgeRemoved", {
										count: knowledgeSourcesCount,
									})}
								</li>
							)}
							{pendingType === "knowledge" && toolsCount > 0 && (
								<li>
									&bull;{" "}
									{t("changeTypeModal.workflowsRemoved", {
										count: toolsCount,
									})}
								</li>
							)}
							{currentType === "workflow" && pendingType !== "workflow" && (
								<li>&bull; {t("changeTypeModal.workflowConfigCleared")}</li>
							)}
							{currentType === "knowledge" && pendingType !== "knowledge" && (
								<li>&bull; {t("changeTypeModal.knowledgeSettingsAdjusted")}</li>
							)}
							<li>&bull; {t("changeTypeModal.behaviorChange")}</li>
						</ul>
					</output>
				)}

				<div className="flex justify-end gap-2 pt-2">
					<Button variant="outline" onClick={handleClose}>
						{t("changeTypeModal.cancel")}
					</Button>
					<Button
						onClick={() => {
							if (pendingType && pendingType !== currentType) {
								onConfirm(pendingType, isEditing);
								handleClose();
							}
						}}
						disabled={!pendingType || pendingType === currentType}
					>
						{isEditing
							? t("changeTypeModal.continue")
							: t("changeTypeModal.confirmChange")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
