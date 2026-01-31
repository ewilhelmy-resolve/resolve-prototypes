import { Trans, useTranslation } from "react-i18next";
import RitaLayout from "@/components/layouts/RitaLayout";
import { MainHeader } from "@/components/MainHeader";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import TicketGroups from "@/components/tickets/TicketGroups";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusters } from "@/hooks/useClusters";
import { TRAINING_STATES } from "@/types/mlModel";

export default function ClustersPage() {
	const { t } = useTranslation("tickets");

	// Get training state from active model
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;

	// Determine loading states
	const hasNoModel = !isModelLoading && activeModel === null;
	const isTraining = trainingState === TRAINING_STATES.IN_PROGRESS;
	const canShowData = trainingState === TRAINING_STATES.COMPLETE;

	// Show skeletons only when: loading model OR training in progress
	// NOT when there's no model - that should show empty state
	const showSkeletons = isModelLoading || isTraining;

	// Only fetch clusters when training is complete
	const { data: clustersResponse } = useClusters({ enabled: canShowData });

	const clusters = clustersResponse?.data ?? [];
	const totalTickets = clusters.reduce((sum, c) => sum + c.ticket_count, 0);
	const clusterCount = clusters.length;

	// Header description: skeleton when loading/training, empty string when no model, real data otherwise
	const headerDescription = showSkeletons ? (
		<Skeleton className="h-4 w-64" />
	) : hasNoModel ? (
		"" // Empty - TicketGroups will show the connect source message
	) : (
		<Trans
			i18nKey="header.description"
			ns="tickets"
			values={{
				ticketCount: totalTickets.toLocaleString(),
				clusterCount,
			}}
			components={{ strong: <span className="font-semibold" /> }}
		/>
	);

	return (
		<RitaLayout activePage="tickets">
			<MainHeader
				title="Tickets"
				description={headerDescription}
				stats={
					<StatGroup>
						<StatCard
							value="--"
							label={t("header.stats.ticketsLast7Days")}
							loading={showSkeletons}
						/>
						<StatCard
							value="0"
							label={t("header.stats.handledAutomatically")}
							loading={showSkeletons}
						/>
						<StatCard
							value="0%"
							label={t("header.stats.automationRate")}
							loading={showSkeletons}
						/>
						<StatCard
							value="0hr"
							label={t("header.stats.aiHoursSaved")}
							loading={showSkeletons}
						/>
					</StatGroup>
				}
			/>
			<TicketGroups />
		</RitaLayout>
	);
}
