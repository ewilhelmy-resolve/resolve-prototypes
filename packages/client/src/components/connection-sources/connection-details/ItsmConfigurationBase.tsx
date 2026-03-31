"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { ritaToast } from "@/components/custom/rita-toast";
import { StatusAlert } from "@/components/custom/status-alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	formatRelativeTime,
	STATUS,
	TIME_RANGE_OPTIONS_KEYS,
} from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { useActiveModel } from "@/hooks/useActiveModel";
import {
	useCancelIngestion,
	useLatestIngestionRun,
	useSyncTickets,
} from "@/hooks/useDataSources";
import { AutoSyncToggle } from "../AutoSyncToggle";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";
import { IngestionErrorAlert } from "../IngestionErrorAlert";
import { SyncErrorAlert } from "../SyncErrorAlert";

interface ItsmConfigurationBaseProps {
	titleKey: string;
	syncStartedDescKey: string;
	onEdit?: () => void;
	/** Extra content rendered inside the sync section before the time range selector (e.g. Jira project selector) */
	children?: ReactNode;
	/** Called before triggering sync. Return false to abort. */
	onBeforeSync?: (backendId: string) => Promise<boolean>;
	/** Extra disabled condition for the sync button */
	isSyncDisabled?: boolean;
	/** Extra pending state to show in the sync button */
	isExtraPending?: boolean;
	/** Rendered after the main content (e.g. Jira confirmation dialog) */
	footer?: ReactNode;
}

export default function ItsmConfigurationBase({
	titleKey,
	syncStartedDescKey,
	onEdit,
	children,
	onBeforeSync,
	isSyncDisabled = false,
	isExtraPending = false,
	footer,
}: ItsmConfigurationBaseProps) {
	const { t } = useTranslation("connections");
	const { source } = useConnectionSource();
	const syncTickets = useSyncTickets();
	const cancelMutation = useCancelIngestion();
	const [selectedTimeRange, setSelectedTimeRange] = useState("30");

	const { data: latestIngestionRun } = useLatestIngestionRun(
		source.backendData?.id,
	);
	const isTicketSyncing =
		latestIngestionRun?.status === "running" ||
		latestIngestionRun?.status === "pending";

	const { data: activeModel } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const isTraining = trainingState === "in_progress";

	const isVerifying =
		source.status.toLowerCase() === STATUS.VERIFYING.toLowerCase();

	const isSyncButtonDisabled =
		isTicketSyncing ||
		isVerifying ||
		syncTickets.isPending ||
		isSyncDisabled ||
		isExtraPending;
	const isCancelButtonDisabled = cancelMutation.isPending;

	const handleSyncTickets = async () => {
		if (!source.backendData) {
			ritaToast.error({
				title: t("config.toast.configError"),
				description: t("config.toast.noBackendData"),
			});
			return;
		}

		try {
			if (onBeforeSync) {
				const shouldContinue = await onBeforeSync(source.backendData.id);
				if (!shouldContinue) return;
			}

			await syncTickets.mutateAsync({
				id: source.backendData.id,
				timeRangeDays: Number.parseInt(selectedTimeRange, 10),
			});

			ritaToast.success({
				title: t("config.toast.syncStarted"),
				description: t(syncStartedDescKey, {
					defaultValue: syncStartedDescKey,
				}),
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
					<FormSectionTitle title={t(titleKey, { defaultValue: titleKey })} />
					<ConnectionActionsMenu onEdit={onEdit} />
				</div>

				<ConnectionStatusCard
					source={source}
					onRetry={handleSyncTickets}
					hideStatusMessage
				/>

				<SyncErrorAlert backendData={source.backendData} onReVerify={onEdit} />
				<IngestionErrorAlert
					latestRun={latestIngestionRun}
					onReVerify={onEdit}
					lastVerificationAt={source.backendData?.last_verification_at}
				/>

				{isTraining && (
					<StatusAlert variant="info" title={t("config.training.inProgress")}>
						<p>{t("config.training.description")}</p>
					</StatusAlert>
				)}

				{source.status.toLowerCase() !== STATUS.ERROR.toLowerCase() &&
					!isVerifying && (
						<div className="flex flex-col gap-1">
							<div className="border border-border bg-popover rounded-md p-4">
								<div className="rounded-lg flex flex-col gap-4">
									{children}

									<div>
										<Label className="mb-2">
											{t("config.labels.importFromLast")}
										</Label>
										<div className="flex flex-col md:flex-row items-start gap-4 mt-2">
											<div className="md:flex-1 w-full">
												<Select
													value={selectedTimeRange}
													onValueChange={setSelectedTimeRange}
													disabled={isTicketSyncing}
												>
													<SelectTrigger className="w-full">
														<SelectValue
															placeholder={t("config.labels.selectTimeRange")}
														/>
													</SelectTrigger>
													<SelectContent>
														{TIME_RANGE_OPTIONS_KEYS.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value}
															>
																{t(option.labelKey)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											{isTicketSyncing ? (
												<Button
													onClick={handleCancelSync}
													disabled={isCancelButtonDisabled}
													className="w-full md:w-fit"
													variant="destructive"
												>
													{cancelMutation.isPending
														? t("config.sync.cancelling")
														: t("config.sync.cancelSync")}
												</Button>
											) : (
												<Button
													onClick={handleSyncTickets}
													disabled={isSyncButtonDisabled}
													className="w-full md:w-fit"
													variant="default"
												>
													{syncTickets.isPending || isExtraPending
														? t("config.sync.importing")
														: t("config.sync.importTickets")}
												</Button>
											)}
										</div>
									</div>

									<div className="border-t border-border pt-4">
										{isTicketSyncing ? (
											latestIngestionRun?.metadata?.progress
												?.total_estimated ? (
												<div className="flex items-center gap-3">
													<Progress
														value={
															(latestIngestionRun.records_processed /
																latestIngestionRun.metadata.progress
																	.total_estimated) *
															100
														}
														className="flex-1"
													/>
													<span className="text-sm text-muted-foreground whitespace-nowrap">
														{t("config.sync.ticketsOf", {
															processed: latestIngestionRun.records_processed,
															total:
																latestIngestionRun.metadata.progress
																	.total_estimated,
														})}
													</span>
												</div>
											) : (
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<Loader2 className="h-4 w-4 animate-spin" />
													{t("config.sync.importingTickets")}
												</div>
											)
										) : latestIngestionRun?.completed_at ? (
											<p className="text-sm text-muted-foreground">
												{t("config.sync.lastSynced", {
													time: formatRelativeTime(
														latestIngestionRun.completed_at,
													),
												})}
												{latestIngestionRun.records_processed > 0 && (
													<span>
														{" "}
														·{" "}
														{t("config.sync.ticketsCount", {
															count: latestIngestionRun.records_processed,
														})}
													</span>
												)}
												{latestIngestionRun.records_failed > 0 && (
													<Tooltip>
														<TooltipTrigger asChild>
															<AlertCircle className="h-4 w-4 text-amber-500 inline ml-1 cursor-help" />
														</TooltipTrigger>
														<TooltipContent className="max-w-[250px]">
															{t("config.sync.ticketsSyncFailed", {
																count: latestIngestionRun.records_failed,
															})}
														</TooltipContent>
													</Tooltip>
												)}
											</p>
										) : (
											<p className="text-sm text-muted-foreground">
												{t("config.sync.noTicketsYet")}
											</p>
										)}
									</div>

									{source.backendData && (
										<AutoSyncToggle
											connectionId={source.backendData.id}
											currentValue={source.backendData.auto_sync}
											disabled={isTicketSyncing}
										/>
									)}
								</div>
							</div>
						</div>
					)}
			</div>

			{footer}
		</div>
	);
}
