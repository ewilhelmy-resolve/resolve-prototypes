import { TrendingUp } from "lucide-react";
import RitaLayout from "@/components/layouts/RitaLayout";
import { MainHeader } from "@/components/MainHeader";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import { Badge } from "@/components/ui/badge";
import TicketGroups from "@/components/tickets/TicketGroups";

export default function TicketsPage2() {
	return (
		<RitaLayout activePage="tickets">
			<MainHeader
				title="Tickets"
				description={
					<span>
						Rita learned from <span className="font-semibold">1,200</span> tickets this month <span className="font-semibold">across 8 issue types</span>
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
						<StatCard value="0" label="Handled Automatically" />
						<StatCard value="0%" label="Automation Rate" />
						<StatCard value="0hr" label="AI hours saved" />
					</StatGroup>
				}
			/>
			<TicketGroups />
		</RitaLayout>
	);
}
