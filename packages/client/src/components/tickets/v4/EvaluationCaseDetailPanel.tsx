import {
	CheckCircle2,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
	X,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EvalCase } from "@/stores/clusterAgentStore";
import { useClusterAgentStore } from "@/stores/clusterAgentStore";

interface EvaluationCaseDetailPanelProps {
	clusterId: string;
	evaluationId: string;
	evalCase: EvalCase | null;
	onClose: () => void;
}

export function EvaluationCaseDetailPanel({
	clusterId,
	evaluationId,
	evalCase,
	onClose,
}: EvaluationCaseDetailPanelProps) {
	const rateEvalCase = useClusterAgentStore((s) => s.rateEvalCase);

	if (!evalCase) return null;

	const isPass = evalCase.score === "pass";

	return (
		<aside className="w-full lg:w-[380px] lg:shrink-0 lg:border-l bg-background flex flex-col">
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<h3 className="text-sm font-medium">Test case details</h3>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					aria-label="Close case details"
					className="size-7"
				>
					<X className="size-4" />
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
				{/* Score header */}
				<div className="flex items-center gap-2">
					{isPass ? (
						<>
							<div className="size-2.5 rounded-full bg-emerald-500" />
							<span className="text-sm font-medium text-emerald-700">
								Seems relevant
							</span>
						</>
					) : (
						<>
							<div className="size-2.5 rounded-full bg-rose-500" />
							<span className="text-sm font-medium text-rose-700">
								Did not pass
							</span>
						</>
					)}
				</div>

				{/* Reviewer thumbs */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-xs text-muted-foreground">
							Rate this evaluation
						</span>
						<Badge
							variant="secondary"
							className="text-[9px] px-1.5 py-0 uppercase"
						>
							AI-generated content may be incorrect
						</Badge>
					</div>
					<div className="flex items-center gap-1.5">
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								"size-8 rounded-full border",
								evalCase.rating === "good" &&
									"bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100",
							)}
							onClick={() =>
								rateEvalCase(
									clusterId,
									evaluationId,
									evalCase.id,
									evalCase.rating === "good" ? null : "good",
								)
							}
							aria-label="Rate good"
						>
							<ThumbsUp className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								"size-8 rounded-full border",
								evalCase.rating === "bad" &&
									"bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-100",
							)}
							onClick={() =>
								rateEvalCase(
									clusterId,
									evaluationId,
									evalCase.id,
									evalCase.rating === "bad" ? null : "bad",
								)
							}
							aria-label="Rate bad"
						>
							<ThumbsDown className="size-4" />
						</Button>
					</div>
				</div>

				{/* Question */}
				<div className="flex flex-col gap-1">
					<div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
						Question
					</div>
					<div className="text-sm">
						{evalCase.ticketExternalId && (
							<span className="font-mono text-xs text-muted-foreground mr-1.5">
								{evalCase.ticketExternalId}
							</span>
						)}
						{evalCase.question}
					</div>
				</div>

				{/* Agent response */}
				<div className="flex flex-col gap-1.5">
					<div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
						Agent response
					</div>
					<div className="text-sm whitespace-pre-line leading-relaxed">
						{evalCase.agentResponse}
					</div>
				</div>

				{/* Failure reason */}
				{!isPass && evalCase.failureReason && (
					<div className="rounded-md border border-rose-200 bg-rose-50/50 p-3 text-xs">
						<div className="font-medium text-rose-700 mb-1">Why it failed</div>
						<div className="text-muted-foreground leading-relaxed">
							{evalCase.failureReason}
						</div>
					</div>
				)}

				{/* Skill breakdown */}
				<div className="flex flex-col gap-2">
					<div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
						Skill outputs
					</div>
					<div className="flex flex-col gap-2">
						{evalCase.skillOutputs.map((output) => (
							<div
								key={output.skillId}
								className={cn(
									"rounded-md border p-2.5",
									!output.ok && "border-rose-200 bg-rose-50/40",
								)}
							>
								<div className="flex items-center gap-2 mb-1">
									{output.ok ? (
										<CheckCircle2 className="size-3.5 text-emerald-600" />
									) : (
										<XCircle className="size-3.5 text-rose-600" />
									)}
									<span className="text-xs font-medium">
										{output.skillName}
									</span>
								</div>
								<div className="flex items-start gap-1.5 pl-5">
									<Sparkles className="size-3 mt-0.5 text-amber-500 shrink-0" />
									<span className="text-xs text-muted-foreground">
										{output.summary}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</aside>
	);
}
