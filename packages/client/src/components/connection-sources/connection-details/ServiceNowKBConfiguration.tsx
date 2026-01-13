"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useCancelSync,
	useTriggerSync,
	useUpdateDataSource,
} from "@/hooks/useDataSources";
import { ritaToast } from "@/components/ui/rita-toast";
import { Label } from "../../ui/label";
import { MultiSelect, type MultiSelectOption } from "../../ui/multi-select";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";

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
	const [selectedKBs, setSelectedKBs] = useState<string[]>([]); // stores sys_ids
	const updateMutation = useUpdateDataSource();
	const syncMutation = useTriggerSync();
	const cancelMutation = useCancelSync();

	const isSyncing =
		source.status.toLowerCase() === STATUS.SYNCING.toLowerCase();
	const isVerifying =
		source.status.toLowerCase() === STATUS.VERIFYING.toLowerCase();

	const isSyncButtonDisabled =
		isSyncing ||
		isVerifying ||
		updateMutation.isPending ||
		syncMutation.isPending;

	const isCancelButtonDisabled = cancelMutation.isPending;

	// Parse available knowledge bases from latest_options (discovered during verification)
	const knowledgeBases: KnowledgeBase[] = useMemo(() => {
		const kbs = source.backendData?.latest_options?.knowledge_base;
		if (!kbs || !Array.isArray(kbs)) return [];
		return kbs;
	}, [source.backendData?.latest_options]);

	// Convert to MultiSelect options (display title, use sys_id as value)
	const availableOptions: MultiSelectOption[] = useMemo(() => {
		return knowledgeBases.map((kb) => ({ label: kb.title, value: kb.sys_id }));
	}, [knowledgeBases]);

	// Initialize selected KBs from settings.knowledge_base (already configured)
	useEffect(() => {
		const selected = source.backendData?.settings?.knowledge_base;
		if (Array.isArray(selected) && selected.length > 0) {
			// Extract sys_ids from saved knowledge_base objects
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
			// Convert selected sys_ids back to full knowledge_base objects
			const selectedKnowledgeBases = selectedKBs
				.map((sysId) => knowledgeBases.find((kb) => kb.sys_id === sysId))
				.filter((kb): kb is KnowledgeBase => kb !== undefined);

			// Step 1: Update selected knowledge bases in settings
			await updateMutation.mutateAsync({
				id: source.backendData.id,
				data: {
					settings: {
						...source.backendData.settings,
						knowledge_base: selectedKnowledgeBases,
					},
				},
			});

			// Step 2: Trigger KB sync
			await syncMutation.mutateAsync(source.backendData.id);

			ritaToast.success({
				title: t("config.toast.syncStarted"),
				description: t("config.toast.syncStartedServiceNowKb"),
			});
		} catch (error) {
			ritaToast.error({
				title: t("config.toast.syncFailed"),
				description:
					error instanceof Error ? error.message : t("config.toast.syncFailedDefault"),
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
					error instanceof Error ? error.message : t("config.toast.cancelFailedDefault"),
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

				{/* Show cancel button when syncing */}
				{isSyncing && (
					<div className="flex flex-col gap-1">
						<div className="border border-border bg-popover rounded-md p-4">
							<div className="rounded-lg flex items-center justify-between">
								<Label>{t("config.sync.inProgress")}</Label>
								<Button
									onClick={handleCancelSync}
									disabled={isCancelButtonDisabled}
									variant="destructive"
								>
									{cancelMutation.isPending ? t("config.sync.cancelling") : t("config.sync.cancelSync")}
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Only show KB tables selector when status is not Error, Verifying, or Syncing */}
				{source.status.toLowerCase() !== STATUS.ERROR.toLowerCase() &&
					!isVerifying &&
					!isSyncing && (
						<div className="flex flex-col gap-1">
							<div className="border border-border bg-popover rounded-md p-4">
								<div className="rounded-lg">
									<Label className="mb-2">
										{t("config.labels.kbQuestion")}
									</Label>
									<div className="flex flex-col md:flex-row items-start gap-4">
										<div className="md:flex-1 w-full">
											<MultiSelect
												animationConfig={{ optionHoverAnimation: "none" }}
												options={availableOptions}
												defaultValue={selectedKBs}
												onValueChange={setSelectedKBs}
												placeholder={t("config.placeholders.chooseKb")}
												searchable={true}
												emptyIndicator={t("config.placeholders.noKb")}
											/>
										</div>
										<Button
											onClick={handleSync}
											disabled={isSyncButtonDisabled}
											className="w-full md:w-fit"
											variant="default"
										>
											{updateMutation.isPending || syncMutation.isPending
												? t("config.sync.syncing")
												: t("config.sync.sync")}
										</Button>
									</div>
								</div>
							</div>
						</div>
					)}
			</div>
		</div>
	);
}
