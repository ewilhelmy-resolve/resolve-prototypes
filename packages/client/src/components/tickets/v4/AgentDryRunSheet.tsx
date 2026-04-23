import confetti from "canvas-confetti";
import {
	CheckCircle2,
	FlaskConical,
	Loader2,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MockAgent } from "@/data/mock-v4-agents";
import {
	type AgentRun,
	useClusterAgentStore,
} from "@/stores/clusterAgentStore";
import { usePresenterStore } from "@/stores/presenterStore";

interface AgentDryRunSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agent: MockAgent | null;
	ticket: {
		id: string;
		externalId?: string;
		title: string;
	} | null;
	clusterId: string;
	/** When set, render in read-only mode using the run's stored outputs */
	readOnlyRun?: AgentRun | null;
}

type SkillStatus = "pending" | "running" | "done";

export function AgentDryRunSheet({
	open,
	onOpenChange,
	agent,
	ticket,
	clusterId,
	readOnlyRun,
}: AgentDryRunSheetProps) {
	const appendRun = useClusterAgentStore((s) => s.appendRun);
	const setAutomation = useClusterAgentStore((s) => s.setAutomation);
	const setRunFeedback = useClusterAgentStore((s) => s.setRunFeedback);
	const automationEnabled = useClusterAgentStore(
		(s) => s.automation[clusterId] ?? false,
	);
	const [feedbackMode, setFeedbackMode] = useState(false);
	const [lastRunId, setLastRunId] = useState<string | null>(null);
	const [failedSkills, setFailedSkills] = useState<Set<string>>(new Set());
	const [feedbackNote, setFeedbackNote] = useState("");
	const scriptedTicket = usePresenterStore((s) => s.scriptedOpenTicket);
	const skipAnimation = scriptedTicket?.skipAnimation ?? false;
	const autoRate = scriptedTicket?.autoRate;
	const [skillStatus, setSkillStatus] = useState<Record<string, SkillStatus>>(
		{},
	);
	const [complete, setComplete] = useState(false);
	const [logged, setLogged] = useState(false);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		if (!open || !agent) return;
		// Read-only mode: instantly mark everything done, skip animation
		if (readOnlyRun) {
			setSkillStatus(
				Object.fromEntries(agent.skills.map((s) => [s.id, "done" as const])),
			);
			setComplete(true);
			setLogged(true);
			return;
		}
		// Presenter-mode shortcut: jump straight to complete state (and optionally auto-rate)
		if (skipAnimation) {
			setSkillStatus(
				Object.fromEntries(agent.skills.map((s) => [s.id, "done" as const])),
			);
			setComplete(true);
			setLogged(false);
			setFeedbackMode(false);
			setFailedSkills(new Set());
			setFeedbackNote("");
			return;
		}
		// Reset and simulate skills firing one-by-one
		setSkillStatus({});
		setComplete(false);
		setLogged(false);
		setFeedbackMode(false);
		setLastRunId(null);
		setFailedSkills(new Set());
		setFeedbackNote("");
		timers.current.forEach(clearTimeout);
		timers.current = [];

		agent.skills.forEach((skill, idx) => {
			const startDelay = 300 + idx * 700;
			const doneDelay = startDelay + 500;
			timers.current.push(
				setTimeout(
					() => setSkillStatus((s) => ({ ...s, [skill.id]: "running" })),
					startDelay,
				),
			);
			timers.current.push(
				setTimeout(
					() => setSkillStatus((s) => ({ ...s, [skill.id]: "done" })),
					doneDelay,
				),
			);
		});
		timers.current.push(
			setTimeout(
				() => setComplete(true),
				300 + agent.skills.length * 700 + 200,
			),
		);

		return () => {
			timers.current.forEach(clearTimeout);
			timers.current = [];
		};
	}, [open, agent, readOnlyRun, skipAnimation]);

	// Auto-rate when presenter directive asks for it (fires after the effect above primes state)
	useEffect(() => {
		if (!open || !agent || !ticket || readOnlyRun || !complete || logged) return;
		if (!autoRate) return;
		handleLogWithRating(autoRate);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, agent, ticket, readOnlyRun, complete, logged, autoRate]);

	if (!agent || !ticket) return null;

	const Icon = agent.icon;

	const fireConfetti = () => {
		const shoot = () =>
			confetti({
				spread: 360,
				ticks: 50,
				gravity: 0.5,
				decay: 0.94,
				startVelocity: 25,
				particleCount: 30,
				scalar: 1.2,
				shapes: ["star", "square", "circle"],
			});
		setTimeout(shoot, 0);
		setTimeout(shoot, 150);
		setTimeout(shoot, 300);
		setTimeout(() => confetti.reset(), 2000);
	};

	const handleLogWithRating = (rating: "good" | "bad") => {
		const id = `run-${Date.now()}`;
		const run: AgentRun = {
			id,
			clusterId,
			ticketId: ticket.id,
			ticketExternalId: ticket.externalId,
			agentId: agent.id,
			startedAt: new Date().toISOString(),
			mode: "dry",
			rating,
			skillOutputs: agent.skills.map((s) => ({
				skillId: s.id,
				summary: s.dryRunSummary,
			})),
		};
		appendRun(clusterId, run);
		setLastRunId(id);
		if (rating === "good") {
			setLogged(true);
			fireConfetti();
		} else {
			// Negative rating → open feedback form before marking "logged"
			setFeedbackMode(true);
		}
	};

	const handleSubmitFeedback = () => {
		if (!lastRunId) return;
		setRunFeedback(clusterId, lastRunId, {
			failedSkills: Array.from(failedSkills),
			note: feedbackNote.trim(),
		});
		setFeedbackMode(false);
		setLogged(true);
	};

	const handleSkipFeedback = () => {
		setFeedbackMode(false);
		setLogged(true);
	};

	const toggleFailedSkill = (skillId: string) => {
		setFailedSkills((prev) => {
			const next = new Set(prev);
			if (next.has(skillId)) next.delete(skillId);
			else next.add(skillId);
			return next;
		});
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<div className="flex items-start gap-3">
						<div className={cn("p-2 rounded-md", agent.iconBg)}>
							<Icon className="size-5" aria-hidden="true" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<SheetTitle className="text-base">{agent.name}</SheetTitle>
								<Badge
									variant="secondary"
									className="text-[10px] flex items-center gap-1"
								>
									<FlaskConical className="size-3" />
									Dry run
								</Badge>
							</div>
							<div className="text-xs text-muted-foreground">
								Simulating on{" "}
								<span className="font-medium text-foreground">
									{ticket.externalId ?? ticket.id}
								</span>
								{" · "}
								<span className="text-foreground">{ticket.title}</span>
							</div>
						</div>
					</div>
				</SheetHeader>

				<div className="px-4 pb-4 flex flex-col gap-3">
					{feedbackMode && (
						<div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3">
							<div className="flex items-start gap-2 mb-2">
								<ThumbsDown className="size-4 mt-0.5 text-rose-600 shrink-0" />
								<div>
									<div className="text-sm font-medium">What went wrong?</div>
									<div className="text-[11px] text-muted-foreground">
										Tap any skill below that was off, and optionally add a note.
										This feedback trains future agent suggestions.
									</div>
								</div>
							</div>
						</div>
					)}

					<div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
						Skills
					</div>
					{agent.skills.map((skill) => {
						const status = skillStatus[skill.id] ?? "pending";
						const flagged = failedSkills.has(skill.id);
						return (
							<button
								type="button"
								key={skill.id}
								onClick={
									feedbackMode ? () => toggleFailedSkill(skill.id) : undefined
								}
								disabled={!feedbackMode}
								className={cn(
									"rounded-lg border p-3 transition-all text-left w-full",
									status === "pending" && "opacity-40",
									feedbackMode && "cursor-pointer hover:border-rose-300",
									flagged && "border-rose-400 bg-rose-50/40",
									!feedbackMode && "cursor-default",
								)}
							>
								<div className="flex items-center gap-2 mb-1">
									{feedbackMode ? (
										<div
											className={cn(
												"size-4 rounded border-2 flex items-center justify-center",
												flagged
													? "border-rose-500 bg-rose-500"
													: "border-muted-foreground/40",
											)}
										>
											{flagged && (
												<CheckCircle2 className="size-3 text-white" />
											)}
										</div>
									) : (
										<>
											{status === "pending" && (
												<div className="size-4 rounded-full border-2 border-muted-foreground/30" />
											)}
											{status === "running" && (
												<Loader2 className="size-4 animate-spin text-blue-600" />
											)}
											{status === "done" && (
												<CheckCircle2 className="size-4 text-emerald-600" />
											)}
										</>
									)}
									<span className="text-sm font-medium">{skill.name}</span>
								</div>
								<p className="text-xs text-muted-foreground mb-2 pl-6">
									{skill.description}
								</p>
								{status === "done" && (
									<div className="pl-6 flex flex-col gap-1.5">
										<div className="text-xs flex items-start gap-1.5">
											<Sparkles className="size-3 mt-0.5 text-amber-500 shrink-0" />
											<span>{skill.dryRunSummary}</span>
										</div>
										{skill.dataPoints && skill.dataPoints.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-1">
												{skill.dataPoints.map((dp) => (
													<Badge
														key={dp}
														variant="outline"
														className="text-[10px] font-mono px-1.5 py-0"
													>
														{dp}
													</Badge>
												))}
											</div>
										)}
									</div>
								)}
							</button>
						);
					})}

					{feedbackMode && (
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="feedback-note"
								className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium"
							>
								Note (optional)
							</label>
							<textarea
								id="feedback-note"
								rows={3}
								placeholder="e.g. KB match was wrong cluster, should have asked for device model first"
								value={feedbackNote}
								onChange={(e) => setFeedbackNote(e.target.value)}
								className="rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					)}

					{complete && !logged && !readOnlyRun && !feedbackMode && (
						<div className="rounded-lg bg-muted/40 p-3 text-xs flex items-start gap-2">
							<FlaskConical className="size-4 mt-0.5 text-muted-foreground shrink-0" />
							<div>
								<div className="font-medium mb-0.5">Simulation complete</div>
								<div className="text-muted-foreground">
									Did this look right? Your rating trains the agent — when most
									runs look good, turn on automation.
								</div>
							</div>
						</div>
					)}
				</div>

				<SheetFooter>
					{readOnlyRun ? (
						<div className="w-full text-center text-xs text-muted-foreground">
							Read-only view of a logged run.
						</div>
					) : feedbackMode ? (
						<div className="w-full flex gap-2">
							<Button
								variant="ghost"
								onClick={handleSkipFeedback}
								className="flex-1"
							>
								Skip
							</Button>
							<Button
								onClick={handleSubmitFeedback}
								className="flex-1"
							>
								Save feedback
							</Button>
						</div>
					) : !logged ? (
						<div className="w-full flex gap-2">
							<Button
								variant="outline"
								onClick={() => handleLogWithRating("bad")}
								disabled={!complete}
								className="flex-1"
							>
								<ThumbsDown className="size-4" />
								Not yet
							</Button>
							<Button
								onClick={() => handleLogWithRating("good")}
								disabled={!complete}
								className="flex-1"
							>
								<ThumbsUp className="size-4" />
								Looks good
							</Button>
						</div>
					) : (
						<div className="w-full flex flex-col gap-2">
							<div className="flex items-center justify-center gap-2 text-sm text-emerald-700">
								<CheckCircle2 className="size-4" />
								Logged — visible in run history
							</div>
							{!automationEnabled && (
								<div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 flex items-start gap-2">
									<Zap className="size-4 mt-0.5 text-emerald-700 shrink-0" />
									<div className="flex-1 min-w-0">
										<div className="text-xs font-medium mb-0.5">
											Trust this agent? Automate it.
										</div>
										<div className="text-[11px] text-muted-foreground leading-snug">
											It will run automatically on new tickets in this cluster.
										</div>
									</div>
									<Button
										size="sm"
										variant="default"
										className="h-7 gap-1 text-xs shrink-0"
										onClick={() => setAutomation(clusterId, true)}
									>
										<Zap className="size-3" />
										Automate
									</Button>
								</div>
							)}
							{automationEnabled && (
								<div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700">
									<Zap className="size-3.5" />
									Automation is on for this cluster
								</div>
							)}
						</div>
					)}
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="w-full"
					>
						Close
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
