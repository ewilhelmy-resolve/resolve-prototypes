import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import TicketSettingsDialog, {
	type TicketSettingsValues,
} from "@/components/dialogs/TicketSettingsDialog";
import RitaLayout from "@/components/layouts/RitaLayout";
import { ClustersPageHeader } from "@/components/tickets/ClustersPageHeader";
import TicketGroups from "@/components/tickets/TicketGroups";
import { ritaToast } from "@/components/ui/rita-toast";
import { formatRelativeTime } from "@/constants/connectionSources";
import {
	useAutopilotSettings,
	useUpdateAutopilotSettings,
} from "@/hooks/api/useAutopilotSettings";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useClusters } from "@/hooks/useClusters";
import { useIsIngesting } from "@/hooks/useIsIngesting";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";
import type { PeriodFilter } from "@/types/cluster";
import { TRAINING_STATES } from "@/types/mlModel";

export default function ClustersPage() {
	const [period, setPeriod] = useState<PeriodFilter>("last90");
	const [settingsOpen, setSettingsOpen] = useState(false);

	// Hydrate Zustand store from API settings
	const { data: apiSettings } = useAutopilotSettings();
	const settingsStore = useTicketSettingsStore();
	const updateMutation = useUpdateAutopilotSettings();
	const setSettings = settingsStore.setSettings;

	useEffect(() => {
		if (apiSettings) {
			setSettings({
				blendedRatePerHour: apiSettings.cost_per_ticket,
				avgMinutesPerTicket: apiSettings.avg_time_per_ticket_minutes,
			});
		}
	}, [apiSettings, setSettings]);

	const { t: tToast } = useTranslation("toast");

	const handleSettingsSave = (values: TicketSettingsValues) => {
		settingsStore.setSettings(values);
		updateMutation.mutate(
			{
				cost_per_ticket: values.blendedRatePerHour,
				avg_time_per_ticket_minutes: values.avgMinutesPerTicket,
			},
			{
				onSuccess: () => {
					ritaToast.success({
						title: tToast("success.autopilotSettingsUpdated"),
					});
				},
				onError: () => {
					ritaToast.error({
						title: tToast("error.autopilotSettingsFailed"),
					});
				},
			},
		);
	};

	// Get training state from active model
	const { data: activeModel, isLoading: isModelLoading } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;

	// Check if any ITSM source is actively importing tickets
	const { isIngesting, latestRun } = useIsIngesting();

	// Determine loading states
	const hasNoModel = !isModelLoading && activeModel === null;
	const isTraining = trainingState === TRAINING_STATES.IN_PROGRESS;
	const canShowData = trainingState === TRAINING_STATES.COMPLETE;

	// Show skeletons for first-time import (no completed model yet)
	// Re-imports keep existing clusters visible with just a banner
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
				lastSynced={
					latestRun?.completed_at
						? formatRelativeTime(latestRun.completed_at)
						: undefined
				}
			/>
			<TicketGroups period={period} />
			<TicketSettingsDialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				defaultValues={{
					blendedRatePerHour: settingsStore.blendedRatePerHour,
					avgMinutesPerTicket: settingsStore.avgMinutesPerTicket,
				}}
				onSave={handleSettingsSave}
			/>
		</RitaLayout>
	);
}
