import { Activity, BarChart3, Bot, Puzzle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProDashboardStats } from "@/types/pro";

interface ProStatsCardsProps {
	stats: ProDashboardStats;
}

const statConfig = [
	{ key: "totalAgents", label: "Total Agents", icon: Bot },
	{ key: "totalSkills", label: "Total Skills", icon: Puzzle },
	{ key: "activeAgents", label: "Active Agents", icon: Activity },
	{ key: "totalApiCalls", label: "API Calls", icon: BarChart3 },
] as const;

function formatValue(key: string, value: number): string {
	if (key === "totalApiCalls") return value.toLocaleString();
	return String(value);
}

export function ProStatsCards({ stats }: ProStatsCardsProps) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{statConfig.map(({ key, label, icon: Icon }) => (
				<Card key={key} className="py-4">
					<CardContent className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
							<Icon
								className="size-5 text-muted-foreground"
								aria-hidden="true"
							/>
						</div>
						<div className="flex flex-col">
							<span className="text-sm text-muted-foreground">{label}</span>
							<span className="text-2xl font-bold tracking-tight">
								{formatValue(key, stats[key])}
							</span>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
