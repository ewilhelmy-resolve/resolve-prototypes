/**
 * AgentCreationOverlay - Inline view replacing the form during agent creation
 *
 * Rendered in place of the form content area (not as a modal).
 * Shows filtered, human-readable progress steps, handles multi-turn input,
 * and displays success/error states with action buttons.
 */

import {
	CheckCircle2,
	Loader2,
	Pencil,
	Play,
	Send,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ReasoningSteps } from "@/components/ai-elements/reasoning-steps";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ExecutionStep } from "@/stores/agentCreationStore";

// Map backend step labels to ReasoningSteps icon/color directives.
// Labels are produced by DirectApiStrategy.getProgressLabel on the server.
const STEP_DIRECTIVE: Record<string, string> = {
	Starting: "[icon:zap,color:primary]",
	Saved: "[icon:check-circle,color:green]",
	Analyzing: "[icon:search,color:primary]",
	Building: "[icon:code,color:primary]",
	Requirements: "[icon:shield,color:green]",
	Created: "[icon:bot,color:green]",
	Processing: "[icon:workflow,color:primary]",
};

function buildReasoningContent(steps: ExecutionStep[]): string {
	return steps
		.map((s) => {
			const prefix =
				STEP_DIRECTIVE[s.stepLabel] ?? "[icon:workflow,color:primary]";
			return `${prefix} ${s.stepLabel} — ${s.stepDetail}`;
		})
		.join("\n");
}

interface AgentCreationOverlayProps {
	status: "idle" | "creating" | "awaiting_input" | "success" | "error";
	/**
	 * Create vs update. Drives the success-state copy and the primary CTA
	 * (Edit/Test for create, Back to Agent for update).
	 */
	mode?: "create" | "update";
	executionSteps: ExecutionStep[];
	inputMessage: string | null;
	agentName: string | null;
	agentId: string | null;
	error: string | null;
	onEditAgent: (agentId: string) => void;
	onTestAgent: (agentId: string) => void;
	onSendInput: (input: string) => void;
	onRetry: () => void;
	onCancel: () => void;
}

export function AgentCreationOverlay({
	status,
	mode = "create",
	executionSteps,
	inputMessage,
	agentName,
	agentId,
	error,
	onEditAgent,
	onTestAgent,
	onSendInput,
	onRetry,
	onCancel,
}: AgentCreationOverlayProps) {
	const { t } = useTranslation("agents");
	const [userInput, setUserInput] = useState("");

	const handleSendInput = () => {
		if (!userInput.trim()) return;
		onSendInput(userInput.trim());
		setUserInput("");
	};

	return (
		<div className="flex flex-1 items-center justify-center p-8">
			<div className="w-full max-w-md">
				{status === "creating" && (
					<div className="flex flex-col items-center gap-6">
						<div className="flex flex-col items-center gap-2 text-center">
							<h2 className="text-lg font-semibold">
								{mode === "update"
									? t("createWithAI.updating")
									: t("createWithAI.creating")}
							</h2>
							<p className="text-sm text-muted-foreground">
								{mode === "update"
									? t("createWithAI.updatingDescription")
									: t("createWithAI.creatingDescription")}
							</p>
						</div>

						{executionSteps.length === 0 && (
							<output
								aria-live="polite"
								aria-busy="true"
								className="flex flex-col items-center gap-2"
							>
								<Loader2
									className="size-8 animate-spin text-primary"
									aria-hidden="true"
								/>
								<span className="sr-only">
									{mode === "update"
										? t("createWithAI.updatingStatus")
										: t("createWithAI.creatingStatus")}
								</span>
							</output>
						)}

						{executionSteps.length > 0 && (
							<div className="w-full bg-muted/30 rounded-lg p-4">
								<ReasoningSteps
									content={buildReasoningContent(executionSteps)}
									isStreaming={true}
								/>
							</div>
						)}

						<Button variant="outline" onClick={onCancel} size="sm">
							{t("createWithAI.cancel")}
						</Button>
					</div>
				)}

				{status === "awaiting_input" && (
					<div className="flex flex-col items-center gap-6">
						<div className="flex flex-col items-center gap-2 text-center">
							<h2 className="text-lg font-semibold">
								{t("createWithAI.awaitingInput")}
							</h2>
							<p className="text-sm text-muted-foreground max-w-sm">
								{inputMessage}
							</p>
						</div>

						<div className="w-full space-y-3">
							<Textarea
								value={userInput}
								onChange={(e) => setUserInput(e.target.value)}
								placeholder={t("createWithAI.inputPlaceholder")}
								aria-label={t("createWithAI.inputAriaLabel")}
								rows={3}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleSendInput();
									}
								}}
							/>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={onCancel} size="sm">
									{t("createWithAI.cancel")}
								</Button>
								<Button
									onClick={handleSendInput}
									disabled={!userInput.trim()}
									className="gap-2"
									size="sm"
								>
									<Send className="size-3.5" />
									{t("createWithAI.send")}
								</Button>
							</div>
						</div>
					</div>
				)}

				{status === "success" && agentId && (
					<div className="flex flex-col items-center gap-6">
						<CheckCircle2 className="size-14 text-emerald-500" />
						<div className="flex flex-col items-center gap-2 text-center">
							<h2 className="text-lg font-semibold">
								{mode === "update"
									? t("createWithAI.updateSuccess")
									: t("createWithAI.success")}
							</h2>
							<p className="text-sm text-muted-foreground">
								{mode === "update"
									? t("createWithAI.updateSuccessDescription", {
											agentName: agentName || "",
										})
									: t("createWithAI.successDescription", {
											agentName: agentName || "",
										})}
							</p>
						</div>
						<div className="flex gap-3">
							{mode === "update" ? (
								<Button className="gap-2" onClick={() => onEditAgent(agentId)}>
									<Pencil className="size-4" />
									{t("createWithAI.backToAgent")}
								</Button>
							) : (
								<>
									<Button
										variant="outline"
										className="gap-2"
										onClick={() => onEditAgent(agentId)}
									>
										<Pencil className="size-4" />
										{t("createWithAI.editAgent")}
									</Button>
									<Button
										className="gap-2"
										onClick={() => onTestAgent(agentId)}
									>
										<Play className="size-4" />
										{t("createWithAI.testAgent")}
									</Button>
								</>
							)}
						</div>
					</div>
				)}

				{status === "error" && (
					<div className="flex flex-col items-center gap-6">
						<XCircle className="size-14 text-destructive" />
						<div className="flex flex-col items-center gap-2 text-center">
							<h2 className="text-lg font-semibold">
								{mode === "update"
									? t("createWithAI.updateError")
									: t("createWithAI.error")}
							</h2>
							<p className="text-sm text-muted-foreground max-w-sm">
								{error || t("createWithAI.errorDefault")}
							</p>
						</div>
						<div className="flex gap-3">
							<Button variant="outline" onClick={onCancel}>
								{t("createWithAI.cancel")}
							</Button>
							<Button onClick={onRetry}>{t("createWithAI.tryAgain")}</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
