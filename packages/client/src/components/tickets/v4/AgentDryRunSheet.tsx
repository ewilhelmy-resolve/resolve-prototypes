import {
	CheckCircle2,
	FlaskConical,
	Loader2,
	Play,
	Sparkles,
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
}

type SkillStatus = "pending" | "running" | "done";

export function AgentDryRunSheet({
	open,
	onOpenChange,
	agent,
	ticket,
	clusterId,
}: AgentDryRunSheetProps) {
	const appendRun = useClusterAgentStore((s) => s.appendRun);
	const [skillStatus, setSkillStatus] = useState<Record<string, SkillStatus>>(
		{},
	);
	const [complete, setComplete] = useState(false);
	const [logged, setLogged] = useState(false);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		if (!open || !agent) return;
		// Reset and simulate skills firing one-by-one
		setSkillStatus({});
		setComplete(false);
		setLogged(false);
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
	}, [open, agent]);

	if (!agent || !ticket) return null;

	const Icon = agent.icon;

	const handleLogRun = () => {
		const run: AgentRun = {
			id: `run-${Date.now()}`,
			clusterId,
			ticketId: ticket.id,
			ticketExternalId: ticket.externalId,
			agentId: agent.id,
			startedAt: new Date().toISOString(),
			mode: "dry",
			rating: null,
			skillOutputs: agent.skills.map((s) => ({
				skillId: s.id,
				summary: s.dryRunSummary,
			})),
		};
		appendRun(clusterId, run);
		setLogged(true);
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
					<div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
						Skills
					</div>
					{agent.skills.map((skill) => {
						const status = skillStatus[skill.id] ?? "pending";
						return (
							<div
								key={skill.id}
								className={cn(
									"rounded-lg border p-3 transition-opacity",
									status === "pending" && "opacity-40",
								)}
							>
								<div className="flex items-center gap-2 mb-1">
									{status === "pending" && (
										<div className="size-4 rounded-full border-2 border-muted-foreground/30" />
									)}
									{status === "running" && (
										<Loader2 className="size-4 animate-spin text-blue-600" />
									)}
									{status === "done" && (
										<CheckCircle2 className="size-4 text-emerald-600" />
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
							</div>
						);
					})}

					{complete && (
						<div className="rounded-lg bg-muted/40 p-3 text-xs flex items-start gap-2">
							<FlaskConical className="size-4 mt-0.5 text-muted-foreground shrink-0" />
							<div>
								<div className="font-medium mb-0.5">Simulation complete</div>
								<div className="text-muted-foreground">
									No side effects were taken. Log this dry run to evaluate the
									agent later.
								</div>
							</div>
						</div>
					)}
				</div>

				<SheetFooter>
					{!logged ? (
						<Button
							onClick={handleLogRun}
							disabled={!complete}
							className="w-full"
						>
							<Play className="size-4" />
							Log dry run
						</Button>
					) : (
						<div className="w-full flex items-center justify-center gap-2 text-sm text-emerald-700">
							<CheckCircle2 className="size-4" />
							Logged — visible in run history
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
