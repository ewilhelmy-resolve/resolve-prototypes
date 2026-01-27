import { Trans, useTranslation } from "react-i18next";
import RitaLayout from "@/components/layouts/RitaLayout";
import { MainHeader } from "@/components/MainHeader";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import TicketGroups from "@/components/tickets/TicketGroups";
import { useClusters } from "@/hooks/useClusters";

export default function ClustersPage() {
	const { t } = useTranslation("tickets");
	const { data: clusters } = useClusters();

	const totalTickets =
		clusters?.reduce((sum, c) => sum + c.ticket_count, 0) ?? 0;
	const clusterCount = clusters?.length ?? 0;

	return (
		<RitaLayout activePage="tickets">
			<MainHeader
				title="Tickets"
				description={
					<Trans
						i18nKey="header.description"
						ns="tickets"
						values={{
							ticketCount: totalTickets.toLocaleString(),
							clusterCount,
						}}
						components={{ strong: <span className="font-semibold" /> }}
					/>
				}
				stats={
					<StatGroup>
						<StatCard value="--" label={t("header.stats.ticketsLast7Days")} />
						<StatCard
							value="0"
							label={t("header.stats.handledAutomatically")}
						/>
						<StatCard value="0%" label={t("header.stats.automationRate")} />
						<StatCard value="0hr" label={t("header.stats.aiHoursSaved")} />
					</StatGroup>
				}
			/>
			<TicketGroups />
		</RitaLayout>
	);
}
