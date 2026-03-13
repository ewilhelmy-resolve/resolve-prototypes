"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ritaToast } from "@/components/ui/rita-toast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import type { MultiSelectOption } from "../../ui/multi-select";
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

	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
	const [syncInterval, setSyncInterval] = useState("24h");

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

	const handleAnalyzeKnowledge = async () => {
		setIsAnalyzing(true);
		// Simulate analysis — will be replaced with real API call
		await new Promise((r) => setTimeout(r, 2000));
		setIsAnalyzing(false);
		ritaToast.success({
			title: "Analysis complete",
			description: "Knowledge sources have been analyzed and matched to ticket clusters.",
		});
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

			<Separator className="my-4" />

			{/* Knowledge Analysis */}
			<div className="flex flex-col gap-2.5">
				<FormSectionTitle title="Knowledge Analysis" />

				<div className="border border-border bg-popover rounded-md p-4 flex flex-col gap-4">
					<div>
						<p className="text-sm text-muted-foreground">
							Analyze synced knowledge against your ticket clusters to identify coverage gaps and matches.
						</p>
					</div>

					<Button
						onClick={handleAnalyzeKnowledge}
						disabled={isAnalyzing || isSyncing}
						variant="outline"
						className="w-fit"
					>
						{isAnalyzing ? (
							<>
								<Loader2 className="size-4 animate-spin mr-1.5" />
								Analyzing...
							</>
						) : (
							<>
								<Search className="size-4 mr-1.5" />
								Analyze Knowledge
							</>
						)}
					</Button>
				</div>

				{/* Auto-sync Schedule */}
				<div className="border border-border bg-popover rounded-md p-4 flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<div>
							<Label>Auto-sync schedule</Label>
							<p className="text-sm text-muted-foreground mt-0.5">
								Automatically sync and analyze on a recurring schedule.
							</p>
						</div>
						<Switch
							checked={autoSyncEnabled}
							onCheckedChange={setAutoSyncEnabled}
							aria-label="Toggle auto-sync"
						/>
					</div>

					{autoSyncEnabled && (
						<div className="flex items-center gap-3">
							<Label className="shrink-0">Run every</Label>
							<Select value={syncInterval} onValueChange={setSyncInterval}>
								<SelectTrigger className="w-[160px]" aria-label="Sync interval">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="6h">6 hours</SelectItem>
									<SelectItem value="12h">12 hours</SelectItem>
									<SelectItem value="24h">24 hours</SelectItem>
									<SelectItem value="48h">48 hours</SelectItem>
									<SelectItem value="7d">7 days</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
