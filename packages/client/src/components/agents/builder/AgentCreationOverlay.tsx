/**
 * AgentCreationOverlay - Inline view replacing the form during agent creation
 *
 * Rendered in place of the form content area (not as a modal).
 * Shows filtered, human-readable progress steps, handles multi-turn input,
 * and displays success/error states with action buttons.
 */

import {
	CheckCircle2,
	CircleDot,
	Loader2,
	Pencil,
	Play,
	Send,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ExecutionStep } from "@/stores/agentCreationStore";

interface AgentCreationOverlayProps {
	status: "idle" | "creating" | "awaiting_input" | "success" | "error";
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
								{t("createWithAI.creating")}
							</h2>
							<p className="text-sm text-muted-foreground">
								{t("createWithAI.creatingDescription")}
							</p>
						</div>

						{executionSteps.length === 0 && (
							<Loader2 className="size-8 animate-spin text-primary" />
						)}

						{executionSteps.length > 0 && (
							<div className="w-full space-y-3 bg-muted/30 rounded-lg p-4">
								{executionSteps.map((step, i) => {
									const isLast = i === executionSteps.length - 1;
									return (
										<div
											key={`${step.stepType}-${i}`}
											className="flex items-start gap-3"
										>
											{isLast ? (
												<CircleDot className="size-4 mt-0.5 text-primary animate-pulse shrink-0" />
											) : (
												<CheckCircle2 className="size-4 mt-0.5 text-emerald-500 shrink-0" />
											)}
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium leading-tight">
													{step.stepLabel}
												</p>
												<p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
													{step.stepDetail}
												</p>
											</div>
										</div>
									);
								})}
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
								{t("createWithAI.success")}
							</h2>
							<p className="text-sm text-muted-foreground">
								{t("createWithAI.successDescription", {
									agentName: agentName || "",
								})}
							</p>
						</div>
						<div className="flex gap-3">
							<Button
								variant="outline"
								className="gap-2"
								onClick={() => onEditAgent(agentId)}
							>
								<Pencil className="size-4" />
								{t("createWithAI.editAgent")}
							</Button>
							<Button className="gap-2" onClick={() => onTestAgent(agentId)}>
								<Play className="size-4" />
								{t("createWithAI.testAgent")}
							</Button>
						</div>
					</div>
				)}

				{status === "error" && (
					<div className="flex flex-col items-center gap-6">
						<XCircle className="size-14 text-destructive" />
						<div className="flex flex-col items-center gap-2 text-center">
							<h2 className="text-lg font-semibold">
								{t("createWithAI.error")}
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
