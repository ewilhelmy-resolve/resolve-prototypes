import {
	ChevronRight,
	CircleCheck,
	CircleX,
	FlaskConical,
	Loader2,
	Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MockAgent } from "@/data/mock-v4-agents";
import { cn } from "@/lib/utils";
import {
	type EvalCase,
	type EvaluationRun,
	useClusterAgentStore,
} from "@/stores/clusterAgentStore";
import { EvaluationCaseDetailPanel } from "./EvaluationCaseDetailPanel";
import { EvaluationKickoffSheet } from "./EvaluationKickoffSheet";

const EMPTY_EVALS: EvaluationRun[] = [];

interface EvaluationsTabProps {
	clusterId: string;
	clusterName: string;
	agent: MockAgent | null;
}

type FilterMode = "all" | "pass" | "fail";

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

function passRate(run: EvaluationRun): number {
	if (!run.cases.length) return 0;
	const passes = run.cases.filter((c) => c.score === "pass").length;
	return Math.round((passes / run.cases.length) * 100);
}

export function EvaluationsTab({
	clusterId,
	clusterName,
	agent,
}: EvaluationsTabProps) {
	const evaluations = useClusterAgentStore(
		(s) => s.evaluations[clusterId] ?? EMPTY_EVALS,
	);
	const [kickoffOpen, setKickoffOpen] = useState(false);
	const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
	const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
	const [filter, setFilter] = useState<FilterMode>("all");

	const ordered = useMemo(
		() => [...evaluations].slice().reverse(),
		[evaluations],
	);
	const selectedEval = ordered.find((e) => e.id === selectedEvalId) ?? null;
	const selectedCase: EvalCase | null = selectedEval
		? (selectedEval.cases.find((c) => c.id === selectedCaseId) ?? null)
		: null;

	// No agent attached → empty state
	if (!agent) {
		return (
			<div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
				<FlaskConical className="size-6 text-muted-foreground mx-auto mb-2" />
				<h3 className="text-sm font-medium mb-1">No agent attached</h3>
				<p className="text-xs text-muted-foreground max-w-sm mx-auto">
					Attach an agent to this cluster to start evaluating its responses
					against historical tickets.
				</p>
			</div>
		);
	}

	// Detail view: a specific evaluation is selected
	if (selectedEval) {
		const filtered = selectedEval.cases.filter((c) => {
			if (filter === "pass") return c.score === "pass";
			if (filter === "fail") return c.score === "fail";
			return true;
		});
		const passCount = selectedEval.cases.filter(
			(c) => c.score === "pass",
		).length;
		const failCount = selectedEval.cases.filter(
			(c) => c.score === "fail",
		).length;

		return (
			<div className="flex flex-col lg:flex-row gap-0 -mx-4 -mb-4">
				{/* Result table */}
				<div className="flex-1 min-w-0 px-4 pb-4 flex flex-col gap-3">
					{/* Breadcrumb */}
					<div className="flex items-center gap-1 text-xs">
						<button
							type="button"
							onClick={() => {
								setSelectedEvalId(null);
								setSelectedCaseId(null);
								setFilter("all");
							}}
							className="text-muted-foreground hover:text-foreground hover:underline"
						>
							Evaluations
						</button>
						<ChevronRight className="size-3 text-muted-foreground" />
						<span className="text-foreground font-medium">
							{selectedEval.name}
						</span>
					</div>

					{/* Header */}
					<div className="flex items-start justify-between gap-3">
						<div>
							<h2 className="text-base font-medium">Test run result</h2>
							<p className="text-xs text-muted-foreground">
								{selectedEval.sampleSize} test cases ·{" "}
								{formatWhen(selectedEval.startedAt)}
							</p>
						</div>
						{selectedEval.status === "running" && (
							<Badge variant="secondary" className="text-xs gap-1">
								<Loader2 className="size-3 animate-spin" />
								Running
							</Badge>
						)}
					</div>

					{/* Filter pills */}
					<div className="flex items-center gap-1.5">
						{(
							[
								{ key: "all", label: "All", count: selectedEval.cases.length },
								{ key: "pass", label: "Pass", count: passCount },
								{ key: "fail", label: "Fail", count: failCount },
							] as const
						).map((pill) => (
							<button
								key={pill.key}
								type="button"
								onClick={() => setFilter(pill.key)}
								className={cn(
									"rounded-full border px-3 py-1 text-xs font-medium transition-colors",
									filter === pill.key
										? "border-primary bg-primary/10 text-primary"
										: "border-border bg-background hover:bg-muted/50",
								)}
							>
								{pill.label} ({pill.count})
							</button>
						))}
					</div>

					{/* Table */}
					<div className="rounded-lg border bg-card overflow-hidden">
						<div className="grid grid-cols-[2fr_3fr_1.2fr_0.6fr] gap-3 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium border-b bg-muted/20">
							<div>Question</div>
							<div>Agent response</div>
							<div>Test method</div>
							<div className="text-right">Score</div>
						</div>
						<ul className="divide-y">
							{filtered.map((c) => {
								const active = c.id === selectedCaseId;
								return (
									<li key={c.id}>
										<button
											type="button"
											onClick={() => setSelectedCaseId(c.id)}
											className={cn(
												"grid grid-cols-[2fr_3fr_1.2fr_0.6fr] gap-3 px-3 py-2.5 w-full text-left text-sm hover:bg-muted/40 transition-colors items-center",
												active && "bg-primary/5",
											)}
										>
											<div className="min-w-0">
												{c.ticketExternalId && (
													<span className="font-mono text-[11px] text-muted-foreground mr-1.5">
														{c.ticketExternalId}
													</span>
												)}
												<span className="truncate">{c.question}</span>
											</div>
											<div className="truncate text-muted-foreground">
												{c.agentResponse.split("\n")[0].replace(/\*\*/g, "")}
											</div>
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
												<FlaskConical className="size-3" />
												{c.testMethod === "skill-success"
													? "General quality"
													: c.testMethod === "similarity"
														? "Similarity"
														: "Exact match"}
											</div>
											<div className="flex justify-end">
												{c.score === "pass" ? (
													<Badge
														variant="outline"
														className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] px-2 py-0"
													>
														Pass
													</Badge>
												) : (
													<Badge
														variant="outline"
														className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] px-2 py-0"
													>
														Fail
													</Badge>
												)}
											</div>
										</button>
									</li>
								);
							})}
						</ul>
					</div>
				</div>

				{/* Side panel for selected case */}
				{selectedCase && (
					<EvaluationCaseDetailPanel
						clusterId={clusterId}
						evaluationId={selectedEval.id}
						evalCase={selectedCase}
						onClose={() => setSelectedCaseId(null)}
					/>
				)}
			</div>
		);
	}

	// Index view: list of evaluations
	return (
		<div className="flex flex-col gap-5">
			{/* Header — matches Copilot's "Evaluation (preview)" */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-base font-medium flex items-center gap-2">
						Evaluations
						<Badge
							variant="secondary"
							className="text-[10px] uppercase px-1.5 py-0"
						>
							preview
						</Badge>
					</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Test how well <span className="font-medium">{agent.name}</span>{" "}
						handles tickets in this cluster. Run a batch and review pass/fail
						scores.
					</p>
				</div>
				<Button onClick={() => setKickoffOpen(true)} size="sm">
					<Plus className="size-4" />
					New evaluation
				</Button>
			</div>

			{/* Test set card — single card representing this cluster */}
			<div>
				<div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
					Test set
				</div>
				<div className="rounded-lg border bg-card p-3 max-w-sm">
					<div className="text-sm font-medium mb-0.5">{clusterName}</div>
					<div className="text-xs text-muted-foreground">
						Sampled from cluster tickets · last modified just now
					</div>
					<Badge
						variant="secondary"
						className="text-[10px] uppercase px-1.5 py-0 mt-2"
					>
						Active
					</Badge>
				</div>
			</div>

			{/* Recent results */}
			<div>
				<div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">
					Recent results
				</div>
				{ordered.length === 0 ? (
					<div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
						<FlaskConical className="size-5 text-muted-foreground mx-auto mb-2" />
						<p className="text-xs text-muted-foreground mb-3 max-w-sm mx-auto">
							No evaluations yet. Run a batch of tickets through the agent to
							see pass/fail scores.
						</p>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setKickoffOpen(true)}
						>
							<Plus className="size-4" />
							New evaluation
						</Button>
					</div>
				) : (
					<div className="rounded-lg border bg-card overflow-hidden">
						<div className="grid grid-cols-[2fr_1.5fr_0.7fr_1fr_0.9fr] gap-3 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium border-b bg-muted/20">
							<div>Name</div>
							<div>Pass rate</div>
							<div className="text-right">Tickets</div>
							<div>Date</div>
							<div>Status</div>
						</div>
						<ul className="divide-y">
							{ordered.map((run) => {
								const rate = passRate(run);
								return (
									<li key={run.id}>
										<button
											type="button"
											onClick={() => setSelectedEvalId(run.id)}
											className="grid grid-cols-[2fr_1.5fr_0.7fr_1fr_0.9fr] gap-3 px-3 py-2.5 w-full text-left text-sm hover:bg-muted/40 transition-colors items-center"
										>
											<div className="font-medium truncate">{run.name}</div>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium tabular-nums w-9">
													{run.status === "running" ? "—" : `${rate}%`}
												</span>
												<div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
													<div
														className={cn(
															"h-full transition-all",
															rate >= 90
																? "bg-emerald-500"
																: rate >= 70
																	? "bg-amber-500"
																	: "bg-rose-500",
														)}
														style={{
															width:
																run.status === "running" ? "0%" : `${rate}%`,
														}}
													/>
												</div>
											</div>
											<div className="text-right text-muted-foreground">
												{run.sampleSize}
											</div>
											<div className="text-muted-foreground text-xs">
												{formatWhen(run.startedAt)}
											</div>
											<div className="flex items-center gap-1.5">
												{run.status === "running" && (
													<>
														<Loader2 className="size-3.5 animate-spin text-muted-foreground" />
														<span className="text-xs text-muted-foreground">
															Running
														</span>
													</>
												)}
												{run.status === "completed" && (
													<>
														<CircleCheck className="size-3.5 text-emerald-600" />
														<span className="text-xs">Completed</span>
													</>
												)}
												{run.status === "cancelled" && (
													<>
														<CircleX className="size-3.5 text-muted-foreground" />
														<span className="text-xs text-muted-foreground">
															Cancelled
														</span>
													</>
												)}
											</div>
										</button>
									</li>
								);
							})}
						</ul>
					</div>
				)}
			</div>

			<EvaluationKickoffSheet
				open={kickoffOpen}
				onOpenChange={setKickoffOpen}
				clusterId={clusterId}
				clusterName={clusterName}
				agent={agent}
				onStarted={(id) => setSelectedEvalId(id)}
			/>
		</div>
	);
}
