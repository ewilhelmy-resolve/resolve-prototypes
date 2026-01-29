import { TrendingUp } from "lucide-react";
import RitaLayout from "@/components/layouts/RitaLayout";
import { MainHeader } from "@/components/MainHeader";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import { Badge } from "@/components/ui/badge";
import TicketGroups from "@/components/tickets/TicketGroups";
import { useDemoStore } from "@/stores/demo-store";

export default function ClustersPage() {
	const { ticketsAutomated, automationRate, hoursSaved } = useDemoStore();
	console.log("[ClustersPage] Demo store values:", { ticketsAutomated, automationRate, hoursSaved });

	return (
		<RitaLayout activePage="tickets">
			<MainHeader
				title="Tickets"
				description={
					<span>
						Rita learned from <span className="font-semibold">1,200</span> tickets this month <span className="font-semibold">across 8 issue types</span>
					</span>
				}
				stats={
					<StatGroup>
						<StatCard
							value="103K"
							label="Tickets last 7 days"
							badge={
								<Badge variant="outline" className="flex items-center gap-1">
									<TrendingUp className="h-3 w-3" />
									+4.5%
								</Badge>
							}
						/>
						<StatCard value={ticketsAutomated.toLocaleString()} label="Handled Automatically" />
						<StatCard value={`${automationRate}%`} label="Automation Rate" />
						<StatCard value={`${hoursSaved}hr`} label="AI Hours Saved" />
					</StatGroup>
				}
			/>
			<TicketGroups />
		</RitaLayout>
	);
}
