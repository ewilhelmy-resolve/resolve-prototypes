import { FlaskConical, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MockAgent } from "@/data/mock-v4-agents";
import { generateMockEvaluation } from "@/data/mock-evaluations";
import {
	type EvalTestMethod,
	useClusterAgentStore,
} from "@/stores/clusterAgentStore";

interface EvaluationKickoffSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	clusterId: string;
	clusterName: string;
	agent: MockAgent;
	/** Called with the new evaluation id once it begins (so caller can navigate) */
	onStarted?: (evaluationId: string) => void;
}

const SAMPLE_OPTIONS = [10, 25, 50, 100] as const;

const METHODS: {
	value: EvalTestMethod;
	label: string;
	description: string;
	available: boolean;
}[] = [
	{
		value: "skill-success",
		label: "General quality",
		description:
			"Pass if every skill returned a non-error result and meets confidence threshold.",
		available: true,
	},
	{
		value: "similarity",
		label: "Similarity",
		description:
			"Compare agent response against historical resolution. Coming soon.",
		available: false,
	},
	{
		value: "quality",
		label: "Exact match",
		description:
			"Strict text match against expected output. Coming soon.",
		available: false,
	},
];

export function EvaluationKickoffSheet({
	open,
	onOpenChange,
	clusterId,
	clusterName,
	agent,
	onStarted,
}: EvaluationKickoffSheetProps) {
	const startEvaluation = useClusterAgentStore((s) => s.startEvaluation);
	const completeEvaluation = useClusterAgentStore((s) => s.completeEvaluation);
	const [sampleSize, setSampleSize] = useState<number>(25);
	const [method, setMethod] = useState<EvalTestMethod>("skill-success");
	const [name, setName] = useState(`Evaluate ${agent.name}`);

	const handleStart = () => {
		const run = generateMockEvaluation({
			clusterId,
			agent,
			sampleSize,
			testMethod: method,
			name: name.trim() || `Evaluate ${agent.name}`,
		});
		startEvaluation(clusterId, run);
		// Simulate ~30s/question batch — for prototype, complete after 2s so the
		// user sees a "running" → "completed" transition without waiting.
		setTimeout(() => completeEvaluation(clusterId, run.id), 2000);
		onStarted?.(run.id);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-md overflow-y-auto">
				<SheetHeader>
					<div className="flex items-center gap-2">
						<FlaskConical className="size-5 text-muted-foreground" />
						<SheetTitle className="text-base">New evaluation</SheetTitle>
					</div>
					<p className="text-xs text-muted-foreground">
						Run <span className="font-medium text-foreground">{agent.name}</span> against
						a sample of tickets in{" "}
						<span className="font-medium text-foreground">{clusterName}</span> and grade the responses.
					</p>
				</SheetHeader>

				<div className="px-4 pb-4 flex flex-col gap-5">
					<div className="flex flex-col gap-2">
						<Label htmlFor="eval-name" className="text-xs">
							Name
						</Label>
						<Input
							id="eval-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={`Evaluate ${agent.name}`}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label className="text-xs">Sample size</Label>
						<div className="grid grid-cols-4 gap-2">
							{SAMPLE_OPTIONS.map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setSampleSize(n)}
									className={cn(
										"rounded-md border py-2 text-sm font-medium transition-colors",
										sampleSize === n
											? "border-primary bg-primary/5 text-primary"
											: "border-border hover:bg-muted/50",
									)}
								>
									{n}
								</button>
							))}
						</div>
						<p className="text-[11px] text-muted-foreground">
							Tickets are sampled from this cluster. ~30 sec per ticket — {sampleSize}{" "}
							tickets ≈ {Math.ceil((sampleSize * 30) / 60)} min.
						</p>
					</div>

					<div className="flex flex-col gap-2">
						<Label className="text-xs">Test method</Label>
						<div className="flex flex-col gap-1.5">
							{METHODS.map((m) => (
								<button
									key={m.value}
									type="button"
									onClick={() => m.available && setMethod(m.value)}
									disabled={!m.available}
									className={cn(
										"rounded-md border p-2.5 text-left transition-colors",
										method === m.value && m.available
											? "border-primary bg-primary/5"
											: "border-border",
										m.available
											? "hover:bg-muted/50 cursor-pointer"
											: "opacity-60 cursor-not-allowed",
									)}
								>
									<div className="flex items-center gap-2">
										<Sparkles
											className={cn(
												"size-3.5",
												method === m.value && m.available
													? "text-primary"
													: "text-muted-foreground",
											)}
										/>
										<span className="text-sm font-medium">{m.label}</span>
										{!m.available && (
											<Badge
												variant="secondary"
												className="text-[9px] uppercase px-1 py-0"
											>
												Soon
											</Badge>
										)}
									</div>
									<p className="text-[11px] text-muted-foreground mt-1 leading-snug">
										{m.description}
									</p>
								</button>
							))}
						</div>
					</div>
				</div>

				<SheetFooter>
					<div className="w-full flex gap-2">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button onClick={handleStart} className="flex-1">
							<FlaskConical className="size-4" />
							Start evaluation
						</Button>
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
