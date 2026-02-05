"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ritaToast } from "@/components/ui/rita-toast";
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
import { Label } from "../../ui/label";
import { MultiSelect, type MultiSelectOption } from "../../ui/multi-select";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";

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
	const isVerifying =
		source.status.toLowerCase() === STATUS.VERIFYING.toLowerCase();

	const isSyncButtonDisabled =
		isSyncing ||
		isVerifying ||
		updateMutation.isPending ||
		syncMutation.isPending;

	const isCancelButtonDisabled = cancelMutation.isPending;

	// Parse available spaces from latest_options (discovered during verification)
	const availableSpaces: MultiSelectOption[] = useMemo(() => {
		const spaces = parseAvailableSpaces(source.backendData?.latest_options);
		return spaces.map((space) => ({ label: space, value: space }));
	}, [source.backendData?.latest_options]);

	// Initialize selected spaces from settings.spaces (already configured)
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
			// Step 1: Update selected spaces in settings
			await updateMutation.mutateAsync({
				id: source.backendData.id,
				data: {
					settings: {
						...source.backendData.settings,
						spaces: selectedSpaces.join(","),
					},
				},
			});

			// Step 2: Trigger sync
			await syncMutation.mutateAsync(source.backendData.id);

			ritaToast.success({
				title: t("config.toast.syncStarted"),
				description: t("config.toast.syncStartedConfluence"),
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
					<FormSectionTitle title={t("config.titles.confluence")} />
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

				{/* Only show spaces selector when status is not Error, Verifying, or Syncing */}
				{source.status.toLowerCase() !== STATUS.ERROR.toLowerCase() &&
					!isVerifying &&
					!isSyncing && (
						<div className="flex flex-col gap-1">
							<div className="border border-border bg-popover rounded-md p-4">
								<div className="rounded-lg">
									<Label className="mb-2">
										{t("config.labels.spacesQuestion")}
									</Label>
									<div className="flex flex-col md:flex-row items-start gap-4">
										<div className="md:flex-1 w-full">
											<MultiSelect
												animationConfig={{ optionHoverAnimation: "none" }}
												options={availableSpaces}
												defaultValue={selectedSpaces}
												onValueChange={setSelectedSpaces}
												placeholder={t("config.placeholders.chooseSpaces")}
												searchable={true}
												emptyIndicator={t("config.placeholders.noSpaces")}
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
