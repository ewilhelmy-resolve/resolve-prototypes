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
import type { MultiSelectOption } from "../../custom/multi-select";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";
import { SyncErrorAlert } from "../SyncErrorAlert";
import KbSyncSection from "./KbSyncSection";

interface KnowledgeBase {
	title: string;
	sys_id: string;
}

interface ServiceNowKBConfigurationProps {
	onEdit?: () => void;
}

export default function ServiceNowKBConfiguration({
	onEdit,
}: ServiceNowKBConfigurationProps = {}) {
	const { t } = useTranslation("connections");
	const { source } = useConnectionSource();
	const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
	const updateMutation = useUpdateDataSource();
	const syncMutation = useTriggerSync();
	const cancelMutation = useCancelSync();

	const isSyncing =
		source.status.toLowerCase() === STATUS.SYNCING.toLowerCase();

	const knowledgeBases: KnowledgeBase[] = useMemo(() => {
		const kbs = source.backendData?.latest_options?.knowledge_base;
		if (!kbs || !Array.isArray(kbs)) return [];
		return kbs;
	}, [source.backendData?.latest_options]);

	const availableOptions: MultiSelectOption[] = useMemo(() => {
		return knowledgeBases.map((kb) => ({ label: kb.title, value: kb.sys_id }));
	}, [knowledgeBases]);

	useEffect(() => {
		const selected = source.backendData?.settings?.knowledge_base;
		if (Array.isArray(selected) && selected.length > 0) {
			setSelectedKBs(selected.map((kb: KnowledgeBase) => kb.sys_id));
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
			const selectedKnowledgeBases = selectedKBs
				.map((sysId) => knowledgeBases.find((kb) => kb.sys_id === sysId))
				.filter((kb): kb is KnowledgeBase => kb !== undefined);

			await updateMutation.mutateAsync({
				id: source.backendData.id,
				data: {
					settings: {
						...source.backendData.settings,
						knowledge_base: selectedKnowledgeBases,
					},
				},
			});

			await syncMutation.mutateAsync(source.backendData.id);

			ritaToast.success({
				title: t("config.toast.syncStarted"),
				description: t("config.toast.syncStartedServiceNowKb"),
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
					<FormSectionTitle title={t("config.titles.servicenowKb")} />
					<ConnectionActionsMenu onEdit={onEdit} />
				</div>

				<ConnectionStatusCard source={source} onRetry={handleSync} />
				<SyncErrorAlert backendData={source.backendData} onReVerify={onEdit} />

				<KbSyncSection
					source={source}
					label={t("config.labels.kbQuestion")}
					options={availableOptions}
					selectedValues={selectedKBs}
					onSelectedChange={setSelectedKBs}
					placeholder={t("config.placeholders.chooseKb")}
					emptyIndicator={t("config.placeholders.noKb")}
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
