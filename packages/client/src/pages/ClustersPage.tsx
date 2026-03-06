import { useState } from "react";

import TicketSettingsDialog from "@/components/dialogs/TicketSettingsDialog";
import RitaLayout from "@/components/layouts/RitaLayout";
import { ClustersPageHeader } from "@/components/tickets/ClustersPageHeader";
import TicketGroups from "@/components/tickets/TicketGroups";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusters } from "@/hooks/useClusters";
import { useIsIngesting } from "@/hooks/useIsIngesting";
import type { PeriodFilter } from "@/types/cluster";
import { TRAINING_STATES } from "@/types/mlModel";

export default function ClustersPage() {
	const [period, setPeriod] = useState<PeriodFilter>("last90");
	const [settingsOpen, setSettingsOpen] = useState(false);

	// Get training state from active model
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;

	// Check if any ITSM source is actively importing tickets
	const { isIngesting } = useIsIngesting();

	// Determine loading states
	const hasNoModel = !isModelLoading && activeModel === null;
	const isTraining = trainingState === TRAINING_STATES.IN_PROGRESS;
	const canShowData = trainingState === TRAINING_STATES.COMPLETE;

	// Show skeletons for first-time import (no completed model yet)
	const isFirstImport = isIngesting && !canShowData;
	const showSkeletons = isModelLoading || isTraining || isFirstImport;

	// Only fetch clusters when training is complete
	const { data: clustersResponse } = useClusters({
		enabled: canShowData,
		period,
	});

	const totalTickets = clustersResponse?.totals?.total_tickets ?? 0;
	const automatedTickets =
		clustersResponse?.totals?.total_automated_tickets ?? 0;

	return (
		<RitaLayout activePage="tickets">
			<ClustersPageHeader
				period={period}
				onPeriodChange={setPeriod}
				totalTickets={totalTickets}
				automatedTickets={automatedTickets}
				showSkeletons={showSkeletons}
				hasNoModel={hasNoModel}
				onSettingsClick={() => setSettingsOpen(true)}
			/>
			<TicketGroups period={period} />
			<TicketSettingsDialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
			/>
		</RitaLayout>
	);
}
