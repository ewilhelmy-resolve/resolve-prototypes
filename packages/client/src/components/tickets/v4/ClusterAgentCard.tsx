import { Bot, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getMockAgentById, MOCK_V4_AGENTS } from "@/data/mock-v4-agents";
import { useClusterAgentStore } from "@/stores/clusterAgentStore";

interface ClusterAgentCardProps {
	clusterId: string;
}

export function ClusterAgentCard({ clusterId }: ClusterAgentCardProps) {
	const attachedAgentId = useClusterAgentStore(
		(s) => s.bindings[clusterId] ?? null,
	);
	const attachAgent = useClusterAgentStore((s) => s.attachAgent);
	const detachAgent = useClusterAgentStore((s) => s.detachAgent);
	const agent = getMockAgentById(attachedAgentId);
	const [open, setOpen] = useState(false);

	if (!agent) {
		return (
			<div className="rounded-lg border border-dashed bg-muted/30 p-4">
				<div className="flex items-center gap-2 mb-2">
					<Bot className="size-4 text-muted-foreground" />
					<h3 className="text-sm font-medium">No agent attached</h3>
				</div>
				<p className="text-xs text-muted-foreground mb-3">
					Attach an agent to simulate skills and evaluate its performance on
					tickets in this cluster.
				</p>
				<DropdownMenu open={open} onOpenChange={setOpen}>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="w-full justify-between">
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
				</div>
			</div>
			<div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-3">
				<Check className="size-3 text-emerald-600" />
				<span>Attached to this cluster — run on tickets below</span>
			</div>
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
