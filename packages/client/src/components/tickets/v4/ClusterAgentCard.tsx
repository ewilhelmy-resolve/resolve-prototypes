import { Bot, ChevronDown, FlaskConical, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { getMockAgentById, MOCK_V4_AGENTS } from "@/data/mock-v4-agents";
import { useClusterDetails } from "@/hooks/useClusters";
import { suggestAgentForCluster } from "@/lib/tickets/agent-suggestion";
import { cn } from "@/lib/utils";
import {
	type AgentRun,
	useClusterAgentStore,
} from "@/stores/clusterAgentStore";
import { AgentSuggestionCard } from "./AgentSuggestionCard";

const EMPTY_RUNS: AgentRun[] = [];
const EMPTY_RUN_MAP: Record<string, AgentRun[]> = {};

interface ClusterAgentCardProps {
	clusterId: string;
	onEvaluate?: () => void;
}

export function ClusterAgentCard({
	clusterId,
	onEvaluate,
}: ClusterAgentCardProps) {
	const attachedAgentId = useClusterAgentStore(
		(s) => s.bindings[clusterId] ?? null,
	);
	const automationEnabled = useClusterAgentStore(
		(s) => s.automation[clusterId] ?? false,
	);
	const runs = useClusterAgentStore((s) => s.runs[clusterId] ?? EMPTY_RUNS);
	const ratedGood = runs.filter((r) => r.rating === "good").length;
	const ratedAny = runs.filter((r) => r.rating !== null).length;
	const attachAgent = useClusterAgentStore((s) => s.attachAgent);
	const detachAgent = useClusterAgentStore((s) => s.detachAgent);
	const setAutomation = useClusterAgentStore((s) => s.setAutomation);
	const agent = getMockAgentById(attachedAgentId);
	const [open, setOpen] = useState(false);
	const [suggestionDismissed, setSuggestionDismissed] = useState(false);
	const { data: cluster } = useClusterDetails(clusterId);
	const allRunsMap = useClusterAgentStore((s) => s.runs ?? EMPTY_RUN_MAP);
	const suggestion =
		cluster && !agent && !suggestionDismissed
			? suggestAgentForCluster(cluster, Object.values(allRunsMap).flat())
			: null;

	if (!agent) {
		return (
			<div className="flex flex-col gap-3">
				{suggestion && (
					<AgentSuggestionCard
						suggestion={suggestion}
						onAccept={() => attachAgent(clusterId, suggestion.agent.id)}
						onDismiss={() => setSuggestionDismissed(true)}
					/>
				)}
				<div className="rounded-lg border border-dashed bg-muted/30 p-4">
					<div className="flex items-center gap-2 mb-2">
						<Bot className="size-4 text-muted-foreground" />
						<h3 className="text-sm font-medium">
							{suggestion ? "Or pick your own" : "No agent attached"}
						</h3>
					</div>
					<p className="text-xs text-muted-foreground mb-3">
						Attach an agent to simulate skills and evaluate its performance on
						tickets in this cluster.
					</p>
					<DropdownMenu open={open} onOpenChange={setOpen}>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-between"
							>
								Attach agent
								<ChevronDown className="size-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-[280px]">
							{MOCK_V4_AGENTS.map((a) => {
								const Icon = a.icon;
								return (
									<DropdownMenuItem
										key={a.id}
										onClick={() => {
											attachAgent(clusterId, a.id);
											setOpen(false);
										}}
										className="flex items-start gap-2 py-2"
									>
										<div className={cn("p-1.5 rounded-md mt-0.5", a.iconBg)}>
											<Icon className="size-3.5" aria-hidden="true" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-xs font-medium">{a.name}</div>
											<div className="text-xs text-muted-foreground line-clamp-2">
												{a.description}
											</div>
										</div>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		);
	}

	const Icon = agent.icon;
	return (
		<div className="rounded-lg border bg-card p-4">
			<div className="flex items-start gap-3 mb-3">
				<div className={cn("p-2 rounded-md", agent.iconBg)}>
					<Icon className="size-4" aria-hidden="true" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-0.5">
						<h3 className="text-sm font-medium truncate">{agent.name}</h3>
						<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
							{agent.skills.length} skills
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground line-clamp-2">
						{agent.description}
					</p>
					{runs.length > 0 && (
						<div className="mt-1.5 text-[11px] text-muted-foreground">
							<span className="font-medium text-foreground">{runs.length}</span>{" "}
							run{runs.length === 1 ? "" : "s"}
							{ratedAny > 0 && (
								<>
									{" · "}
									<span className="font-medium text-emerald-700">
										{ratedGood}
									</span>
									<span>/{ratedAny} rated good</span>
								</>
							)}
						</div>
					)}
				</div>
			</div>
			<div
				className={cn(
					"flex items-start gap-3 rounded-md border p-2.5 mb-3 transition-colors",
					automationEnabled
						? "border-emerald-200 bg-emerald-50/50"
						: "border-border bg-muted/30",
				)}
			>
				<div
					className={cn(
						"p-1 rounded mt-0.5",
						automationEnabled ? "bg-emerald-100" : "bg-background",
					)}
				>
					<Zap
						className={cn(
							"size-3",
							automationEnabled ? "text-emerald-700" : "text-muted-foreground",
						)}
					/>
				</div>
				<div className="flex-1 min-w-0">
					<div className="text-xs font-medium leading-tight">
						{automationEnabled ? "Automation on" : "Automation off"}
					</div>
					<div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
						{automationEnabled
							? "Agent runs automatically on new tickets in this cluster."
							: "Dry-run until you trust it, then turn on."}
					</div>
				</div>
				<Switch
					checked={automationEnabled}
					onCheckedChange={(checked) => setAutomation(clusterId, checked)}
					aria-label="Toggle automation for this cluster"
				/>
			</div>
			{onEvaluate && (
				<Button size="sm" onClick={onEvaluate} className="w-full mb-2">
					<FlaskConical className="size-4" />
					Evaluate
				</Button>
			)}
			<div className="flex gap-2">
				<DropdownMenu open={open} onOpenChange={setOpen}>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="flex-1">
							Change
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-[280px]">
						{MOCK_V4_AGENTS.map((a) => {
							const ItemIcon = a.icon;
							return (
								<DropdownMenuItem
									key={a.id}
									onClick={() => {
										attachAgent(clusterId, a.id);
										setOpen(false);
									}}
									className="flex items-start gap-2 py-2"
								>
									<div className={cn("p-1.5 rounded-md mt-0.5", a.iconBg)}>
										<ItemIcon className="size-3.5" aria-hidden="true" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-xs font-medium">{a.name}</div>
										<div className="text-xs text-muted-foreground line-clamp-2">
											{a.description}
										</div>
									</div>
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => detachAgent(clusterId)}
				>
					Detach
				</Button>
			</div>
		</div>
	);
}
