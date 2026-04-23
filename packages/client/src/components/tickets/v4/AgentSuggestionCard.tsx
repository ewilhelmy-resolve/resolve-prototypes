import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentSuggestion } from "@/lib/tickets/agent-suggestion";

interface AgentSuggestionCardProps {
	suggestion: AgentSuggestion;
	onAccept: () => void;
	onDismiss?: () => void;
}

export function AgentSuggestionCard({
	suggestion,
	onAccept,
	onDismiss,
}: AgentSuggestionCardProps) {
	const { agent, reasons, dampenedSkills } = suggestion;
	const Icon = agent.icon;
	const damped = new Set(dampenedSkills.map((s) => s.skillId));

	return (
		<div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/40 p-4">
			<div className="flex items-center gap-1.5 mb-3">
				<Sparkles className="size-3.5 text-amber-600" />
				<h3 className="text-xs uppercase tracking-wide font-semibold text-amber-700">
					Suggested for this cluster
				</h3>
			</div>

			<div className="flex items-start gap-3 mb-3">
				<div className={cn("p-2 rounded-md", agent.iconBg)}>
					<Icon className="size-4" aria-hidden="true" />
				</div>
				<div className="flex-1 min-w-0">
					<h4 className="text-sm font-medium">{agent.name}</h4>
					<p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
						{agent.description}
					</p>
				</div>
			</div>

			<div className="mb-3">
				<div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5">
					Why
				</div>
				<ul className="flex flex-col gap-1">
					{reasons.map((r) => (
						<li
							key={r}
							className="text-[11px] flex items-start gap-1.5 leading-snug"
						>
							<Check className="size-3 mt-0.5 text-emerald-600 shrink-0" />
							<span>{r}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="mb-3">
				<div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5">
					Skills ({agent.skills.length})
				</div>
				<div className="flex flex-wrap gap-1">
					{agent.skills.map((s) => {
						const isDamped = damped.has(s.id);
						return (
							<Badge
								key={s.id}
								variant={isDamped ? "outline" : "secondary"}
								className={cn(
									"text-[10px] font-normal",
									isDamped && "opacity-50 line-through",
								)}
							>
								{s.name}
							</Badge>
						);
					})}
				</div>
			</div>

			{dampenedSkills.length > 0 && (
				<div className="mb-3 flex items-start gap-1.5 rounded-md bg-white/60 border border-amber-200 px-2.5 py-1.5 text-[11px]">
					<AlertTriangle className="size-3 mt-0.5 text-amber-600 shrink-0" />
					<span className="text-muted-foreground">
						{dampenedSkills.length === 1
							? `"${dampenedSkills[0].skillName}"`
							: `${dampenedSkills.length} skills`}{" "}
						flagged in prior runs — will be monitored closely.
					</span>
				</div>
			)}

			<div className="flex gap-2">
				<Button onClick={onAccept} size="sm" className="flex-1">
					<Sparkles className="size-3" />
					Use this setup
				</Button>
				{onDismiss && (
					<Button onClick={onDismiss} variant="ghost" size="sm">
						Not now
					</Button>
				)}
			</div>
		</div>
	);
}
