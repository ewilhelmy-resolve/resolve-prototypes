"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ritaToast } from "@/components/custom/rita-toast";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useCancelSync,
	useTriggerSync,
	useUpdateDataSource,
} from "@/hooks/useDataSources";
import {
	parseAvailableSpaces,
	parseSelectedSpaces,
} from "@/lib/dataSourceUtils";
import type { MultiSelectOption } from "../../custom/multi-select";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";
import { SyncErrorAlert } from "../SyncErrorAlert";
import KbSyncSection from "./KbSyncSection";

interface ConfluenceConfigurationProps {
	onEdit?: () => void;
}

export default function ConfluenceConfiguration({
	onEdit,
}: ConfluenceConfigurationProps = {}) {
	const { t } = useTranslation(["connections", "toast"]);
	const { source } = useConnectionSource();
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
	const updateMutation = useUpdateDataSource();
	const syncMutation = useTriggerSync();
	const cancelMutation = useCancelSync();

	const isSyncing =
		source.status.toLowerCase() === STATUS.SYNCING.toLowerCase();

	const availableSpaces: MultiSelectOption[] = useMemo(() => {
		const spaces = parseAvailableSpaces(source.backendData?.latest_options);
		return spaces.map((space) => ({ label: space, value: space }));
	}, [source.backendData?.latest_options]);

	useEffect(() => {
		const selected = parseSelectedSpaces(source.backendData?.settings);
		if (selected.length > 0) {
			setSelectedSpaces(selected);
		}
	}, [source.backendData?.settings]);

	const handleSync = async () => {
		if (!source.backendData) {
			ritaToast.error({
				title: t("config.toast.configError"),
				description: t("config.toast.noBackendData"),
			});
			return;
		}

		try {
			await updateMutation.mutateAsync({
				id: source.backendData.id,
				data: {
					settings: {
						...source.backendData.settings,
						spaces: selectedSpaces.join(","),
					},
				},
			});

			await syncMutation.mutateAsync(source.backendData.id);

			ritaToast.success({
				title: t("config.toast.syncStarted"),
				description: t("config.toast.syncStartedConfluence"),
			});
		} catch (error) {
			ritaToast.error({
				title: t("config.toast.syncFailed"),
				description:
					error instanceof Error
						? error.message
						: t("config.toast.syncFailedDefault"),
			});
		}
	};

	const handleCancelSync = async () => {
		if (!source.backendData) {
			ritaToast.error({
				title: t("config.toast.configError"),
				description: t("config.toast.noBackendData"),
			});
			return;
		}

		try {
			await cancelMutation.mutateAsync(source.backendData.id);

			ritaToast.success({
				title: t("config.toast.syncCancelled"),
				description: t("config.toast.syncCancelledDesc"),
			});
		} catch (error) {
			ritaToast.error({
				title: t("config.toast.cancelFailed"),
				description:
					error instanceof Error
						? error.message
						: t("config.toast.cancelFailedDefault"),
			});
		}
	};

	return (
		<div className="w-full flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<div className="flex justify-between items-start gap-2">
					<FormSectionTitle title={t("config.titles.confluence")} />
					<ConnectionActionsMenu onEdit={onEdit} />
				</div>

				<ConnectionStatusCard source={source} onRetry={handleSync} />
				<SyncErrorAlert backendData={source.backendData} onReVerify={onEdit} />

				<KbSyncSection
					source={source}
					label={t("config.labels.spacesQuestion")}
					options={availableSpaces}
					selectedValues={selectedSpaces}
					onSelectedChange={setSelectedSpaces}
					placeholder={t("config.placeholders.chooseSpaces")}
					emptyIndicator={t("config.placeholders.noSpaces")}
					onSync={handleSync}
					onCancelSync={handleCancelSync}
					isSyncDisabled={
						isSyncing || updateMutation.isPending || syncMutation.isPending
					}
					isSyncing={isSyncing}
					isSyncPending={updateMutation.isPending || syncMutation.isPending}
					isCancelPending={cancelMutation.isPending}
					syncingLabel={t("config.sync.syncing")}
					syncLabel={t("config.sync.sync")}
					cancellingLabel={t("config.sync.cancelling")}
					cancelSyncLabel={t("config.sync.cancelSync")}
					inProgressLabel={t("config.sync.inProgress")}
				/>
			</div>
		</div>
	);
}
