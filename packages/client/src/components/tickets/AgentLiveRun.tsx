import {
	Bot,
	CheckCircle2,
	FlaskConical,
	Loader2,
	Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MockAgent } from "@/data/mock-v4-agents";

type SkillStatus = "pending" | "running" | "done";

interface AgentLiveRunProps {
	agent: MockAgent;
	/** Stable identifier for the current ticket — animation resets when this changes */
	ticketKey: string;
	/** Per-ticket label shown above the run */
	ticketLabel?: string;
	className?: string;
	/** Synthetic confidence shown in the final summary */
	confidence?: number;
}

/**
 * Animated dry-run of an agent's skills against a ticket. Fires skill states
 * one-by-one (pending → running → done) so the reviewer sees the agent work.
 *
 * Used inline in the side-by-side review sheet (right panel). Visually mirrors
 * the AIResponseSection on the left so the comparison reads like A/B.
 */
export function AgentLiveRun({
	agent,
	ticketKey,
	ticketLabel,
	className,
	confidence = 88,
}: AgentLiveRunProps) {
	const Icon = agent.icon;
	const [skillStatus, setSkillStatus] = useState<Record<string, SkillStatus>>(
		{},
	);
	const [complete, setComplete] = useState(false);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		setSkillStatus({});
		setComplete(false);
		timers.current.forEach(clearTimeout);
		timers.current = [];

		agent.skills.forEach((skill, idx) => {
			const startDelay = 200 + idx * 600;
			const doneDelay = startDelay + 450;
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
				200 + agent.skills.length * 600 + 100,
			),
		);

		return () => {
			timers.current.forEach(clearTimeout);
			timers.current = [];
		};
	}, [agent, ticketKey]);

	const finalSummary =
		agent.skills[agent.skills.length - 1]?.dryRunSummary ??
		"Agent would resolve this ticket using the steps above.";

	return (
		<div className={cn("flex-1 flex flex-col gap-2 min-h-0", className)}>
			{/* Header with label and badge */}
			<div className="flex items-center gap-2">
				<p className="text-sm text-foreground">Agent response</p>
				<Badge
					className={cn(
						"px-2 py-0.5 border font-semibold gap-1",
						agent.iconBg,
						"text-foreground",
					)}
				>
					<Icon className="size-3" />
					{agent.name}
				</Badge>
				<Badge variant="secondary" className="text-[10px] gap-1">
					<FlaskConical className="size-3" />
					Dry run
				</Badge>
			</div>

			{/* Run log */}
			<div className="flex-1 flex flex-col gap-4 min-h-0">
				<div className="flex-1 bg-blue-50/40 border rounded-lg p-4 overflow-y-auto">
					<div className="flex flex-col gap-2.5">
						{ticketLabel && (
							<div className="text-[11px] text-muted-foreground font-mono">
								Running on {ticketLabel}
							</div>
						)}

						{/* Skill log — animated firing */}
						<div className="flex flex-col gap-2">
							{agent.skills.map((skill) => {
								const status = skillStatus[skill.id] ?? "pending";
								return (
									<div
										key={skill.id}
										className={cn(
											"rounded-md border bg-background p-2.5 transition-opacity",
											status === "pending" && "opacity-40",
										)}
									>
										<div className="flex items-center gap-2 mb-1">
											{status === "pending" && (
												<div className="size-3.5 rounded-full border-2 border-muted-foreground/30" />
											)}
											{status === "running" && (
												<Loader2 className="size-3.5 animate-spin text-blue-600" />
											)}
											{status === "done" && (
												<CheckCircle2 className="size-3.5 text-emerald-600" />
											)}
											<span className="text-sm font-medium">{skill.name}</span>
										</div>
										<p className="text-xs text-muted-foreground pl-5.5 leading-snug">
											{skill.description}
										</p>
										{status === "done" && (
											<div className="mt-1.5 pl-5.5 flex items-start gap-1.5">
												<Sparkles className="size-3 mt-0.5 text-amber-500 shrink-0" />
												<span className="text-xs">{skill.dryRunSummary}</span>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{/* Summary appears after all skills complete */}
						{complete && (
							<div className="border-t pt-3 mt-1">
								<div className="flex items-start gap-1.5 mb-2">
									<Sparkles className="size-3.5 mt-0.5 text-amber-500 shrink-0" />
									<p className="text-sm leading-relaxed font-medium">
										{finalSummary}
									</p>
								</div>
								<div className="flex items-center gap-2 flex-wrap">
									<div className="flex items-center gap-1 px-2.5 py-1 bg-white border rounded-md h-7">
										<Bot className="size-3 text-muted-foreground" />
										<p className="text-sm">{agent.skills.length} skills</p>
									</div>
									<Badge
										className={cn(
											"px-2 py-0.5 border border-transparent font-semibold",
											confidence >= 80
												? "bg-emerald-600 text-white"
												: confidence >= 60
													? "bg-amber-500 text-white"
													: "bg-rose-600 text-white",
										)}
									>
										{confidence}% confident
									</Badge>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
