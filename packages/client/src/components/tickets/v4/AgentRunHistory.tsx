import {
	FlaskConical,
	History,
	MessageSquareText,
	ThumbsDown,
	ThumbsUp,
	Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	type AgentRun,
	useClusterAgentStore,
} from "@/stores/clusterAgentStore";

const EMPTY_RUNS: AgentRun[] = [];

interface AgentRunHistoryProps {
	clusterId: string;
	onOpenRun?: (run: AgentRun) => void;
}

function formatWhen(iso: string): string {
	const then = new Date(iso);
	const now = Date.now();
	const diffMs = now - then.getTime();
	const mins = Math.floor(diffMs / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	if (days < 7) return `${days}d ago`;
	return then.toLocaleDateString();
}

export function AgentRunHistory({
	clusterId,
	onOpenRun,
}: AgentRunHistoryProps) {
	const runs = useClusterAgentStore((s) => s.runs[clusterId] ?? EMPTY_RUNS);
	const rateRun = useClusterAgentStore((s) => s.rateRun);
	const ordered = [...runs].reverse();

	if (ordered.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-4 bg-muted/20">
				<div className="flex items-center gap-2 mb-1">
					<History className="size-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium">No runs yet</h3>
				</div>
				<p className="text-[11px] text-muted-foreground leading-snug">
					Run the agent on a ticket above to start evaluating its performance.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border bg-card">
			<div className="flex items-center justify-between px-3 py-2 border-b">
				<div className="flex items-center gap-2">
					<History className="size-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium">Run history</h3>
				</div>
				<span className="text-[11px] text-muted-foreground">
					{ordered.length} total
				</span>
			</div>
			<ul className="flex flex-col divide-y">
				{ordered.map((run) => {
					const ticketRef = run.ticketExternalId ?? run.ticketId;
					return (
						<li key={run.id} className="px-3 py-2">
							<div className="flex items-start gap-2 mb-1.5">
								{run.mode === "live" ? (
									<Zap className="size-3 mt-0.5 text-emerald-600 shrink-0" />
								) : (
									<FlaskConical className="size-3 mt-0.5 text-muted-foreground shrink-0" />
								)}
								<div className="flex-1 min-w-0">
									<button
										type="button"
										onClick={() => onOpenRun?.(run)}
										className="text-xs font-medium hover:underline truncate block text-left w-full"
										disabled={!onOpenRun}
									>
										{ticketRef}
									</button>
									<div className="text-[11px] text-muted-foreground">
										{run.skillOutputs.length} skills ·{" "}
										{formatWhen(run.startedAt)}
									</div>
								</div>
								<div className="flex items-center gap-0.5 shrink-0">
									<Button
										variant="ghost"
										size="icon"
										className={cn(
											"size-6",
											run.rating === "good" &&
												"bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
										)}
										onClick={() =>
											rateRun(
												clusterId,
												run.id,
												run.rating === "good" ? null : "good",
											)
										}
										aria-label="Rate good"
									>
										<ThumbsUp className="size-3" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className={cn(
											"size-6",
											run.rating === "bad" &&
												"bg-rose-100 text-rose-700 hover:bg-rose-100",
										)}
										onClick={() =>
											rateRun(
												clusterId,
												run.id,
												run.rating === "bad" ? null : "bad",
											)
										}
										aria-label="Rate bad"
									>
										<ThumbsDown className="size-3" />
									</Button>
								</div>
							</div>
							{run.feedback &&
								(run.feedback.failedSkills.length > 0 || run.feedback.note) && (
									<div className="mt-1 ml-5 flex items-start gap-1.5 rounded bg-rose-50/60 px-2 py-1 text-[11px]">
										<MessageSquareText className="size-3 mt-0.5 text-rose-600 shrink-0" />
										<div className="min-w-0 flex-1">
											{run.feedback.failedSkills.length > 0 && (
												<div className="text-rose-700 font-medium">
													{run.feedback.failedSkills.length} skill
													{run.feedback.failedSkills.length === 1 ? "" : "s"}{" "}
													flagged
												</div>
											)}
											{run.feedback.note && (
												<div className="text-muted-foreground line-clamp-2">
													{run.feedback.note}
												</div>
											)}
										</div>
									</div>
								)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
