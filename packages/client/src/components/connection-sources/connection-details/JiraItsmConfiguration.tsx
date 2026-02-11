"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ritaToast } from "@/components/ui/rita-toast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { StatusAlert } from "@/components/ui/status-alert";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime, STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { useActiveModel } from "@/hooks/useActiveModel";
import {
	useCancelIngestion,
	useLatestIngestionRun,
	useSyncTickets,
	useUpdateDataSource,
} from "@/hooks/useDataSources";
import { parseAvailableSpaces } from "@/lib/dataSourceUtils";
import { MultiSelect, type MultiSelectOption } from "../../ui/multi-select";
import { AutoSyncToggle } from "../AutoSyncToggle";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";

const TIME_RANGE_OPTIONS_KEYS = [
	{ labelKey: "config.timeRanges.last30Days" as const, value: "30" },
	{ labelKey: "config.timeRanges.last60Days" as const, value: "60" },
	{ labelKey: "config.timeRanges.last90Days" as const, value: "90" },
];

interface JiraItsmConfigurationProps {
	onEdit?: () => void;
}

export default function JiraItsmConfiguration({
	onEdit,
}: JiraItsmConfigurationProps = {}) {
	const { t } = useTranslation("connections");
	const { source } = useConnectionSource();
	const syncTickets = useSyncTickets();
	const cancelMutation = useCancelIngestion();
	const updateMutation = useUpdateDataSource();
	const [selectedTimeRange, setSelectedTimeRange] = useState("30");
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
	const [showRemovalConfirm, setShowRemovalConfirm] = useState(false);

	// Track ticket sync status via ingestion runs (separate from knowledge sync)
	const { data: latestIngestionRun } = useLatestIngestionRun(
		source.backendData?.id,
	);
	const isTicketSyncing =
		latestIngestionRun?.status === "running" ||
		latestIngestionRun?.status === "pending";

	// Check training state for banner
	const { data: activeModel } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const isTraining = trainingState === "in_progress";

	const isVerifying =
		source.status.toLowerCase() === STATUS.VERIFYING.toLowerCase();

	// Parse available spaces from latest_options (discovered during verification)
	// Format: "KEY:Name,KEY2:Name2" -> [{value: "KEY", label: "Name"}, ...]
	const availableSpaces: MultiSelectOption[] = useMemo(() => {
		const spaces = parseAvailableSpaces(source.backendData?.latest_options);
		return spaces.map((space) => {
			const [key, name] = space.split(":");
			// If format is "KEY:Name", use key as value and name as label
			// Otherwise fall back to using the whole string for both
			return name
				? { value: key, label: name }
				: { value: space, label: space };
		});
	}, [source.backendData?.latest_options]);

	// Track previously saved project keys to detect removals
	const savedProjectKeys: string[] = useMemo(() => {
		const projectKeys = source.backendData?.settings?.project_keys;
		return Array.isArray(projectKeys) ? projectKeys : [];
	}, [source.backendData?.settings]);

	// Initialize selected projects from settings.project_keys (already configured)
	useEffect(() => {
		if (savedProjectKeys.length > 0) {
			setSelectedSpaces(savedProjectKeys);
		}
	}, [savedProjectKeys]);

	const hasSpacesAvailable = availableSpaces.length > 0;
	const hasSpacesSelected = selectedSpaces.length > 0;

	// Check if user has unselected any previously synced projects
	const removedProjects = useMemo(() => {
		if (savedProjectKeys.length === 0) return [];
		return savedProjectKeys.filter((key) => !selectedSpaces.includes(key));
	}, [savedProjectKeys, selectedSpaces]);
	const hasRemovedProjects = removedProjects.length > 0;

	const isSyncButtonDisabled =
		isTicketSyncing ||
		isVerifying ||
		syncTickets.isPending ||
		updateMutation.isPending ||
		(hasSpacesAvailable && !hasSpacesSelected);
	const isCancelButtonDisabled = cancelMutation.isPending;

	// Show confirmation dialog if projects removed, otherwise sync directly
	const handleSyncTickets = () => {
		if (!source.backendData) {
			ritaToast.error({
				title: t("config.toast.configError"),
				description: t("config.toast.noBackendData"),
			});
			return;
		}

		// Validate at least one space is selected when spaces are available
		if (hasSpacesAvailable && !hasSpacesSelected) {
			ritaToast.error({
				title: t("config.toast.configError"),
				description: t("config.toast.selectAtLeastOneSpace"),
			});
			return;
		}

		// Show confirmation if removing projects
		if (hasRemovedProjects) {
			setShowRemovalConfirm(true);
			return;
		}

		performSync();
	};

	// Actual sync logic
	const performSync = async () => {
		if (!source.backendData) return;

		try {
			// Step 1: Update selected project keys in settings (if projects available)
			if (hasSpacesAvailable) {
				await updateMutation.mutateAsync({
					id: source.backendData.id,
					data: {
						settings: {
							...source.backendData.settings,
							project_keys: selectedSpaces,
						},
					},
				});
			}

			// Step 2: Trigger ticket sync
			await syncTickets.mutateAsync({
				id: source.backendData.id,
				timeRangeDays: parseInt(selectedTimeRange, 10),
			});

			ritaToast.success({
				title: t("config.toast.syncStarted"),
				description: t("config.toast.syncStartedJiraItsm"),
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
					<FormSectionTitle title={t("config.titles.jiraItsm")} />
					<ConnectionActionsMenu onEdit={onEdit} />
				</div>

				<ConnectionStatusCard
					source={source}
					onRetry={handleSyncTickets}
					hideStatusMessage
				/>

				{/* Training in progress banner */}
				{isTraining && (
					<StatusAlert variant="info" title={t("config.training.inProgress")}>
						<p>{t("config.training.description")}</p>
					</StatusAlert>
				)}

				{/* ITSM Sync Section - show when connected and not verifying */}
				{source.status.toLowerCase() !== STATUS.ERROR.toLowerCase() &&
					!isVerifying && (
						<div className="flex flex-col gap-1">
							<div className="border border-border bg-popover rounded-md p-4">
								<div className="rounded-lg flex flex-col gap-4">
									{/* Spaces selector - show only when spaces are available */}
									{hasSpacesAvailable && (
										<div>
											<Label className="mb-2">
												{t("config.labels.projectsQuestion")}
											</Label>
											<div className="flex flex-col md:flex-row items-start gap-4 mt-2">
												<div className="md:flex-1 w-full">
													<MultiSelect
														animationConfig={{ optionHoverAnimation: "none" }}
														options={availableSpaces}
														defaultValue={selectedSpaces}
														onValueChange={setSelectedSpaces}
														placeholder={t(
															"config.placeholders.chooseProjects",
														)}
														searchable={true}
														emptyIndicator={t("config.placeholders.noProjects")}
														disabled={isTicketSyncing}
													/>
												</div>
											</div>
										</div>
									)}

									{/* Warning when projects are removed */}
									{hasRemovedProjects && (
										<StatusAlert
											variant="error"
											title={t("config.warnings.projectsRemovedTitle")}
										>
											<p>{t("config.warnings.projectsRemovedDescription")}</p>
										</StatusAlert>
									)}

									{/*Import tickets controls */}
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
													{updateMutation.isPending || syncTickets.isPending
														? t("config.sync.importing")
														: t("config.sync.importTickets")}
												</Button>
											)}
										</div>
									</div>

									{/* Progress / Last sync info */}
									<div className="border-t border-border pt-4">
										{isTicketSyncing ? (
											// Show progress when syncing
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
										) : // Show last sync info when not syncing
										latestIngestionRun?.completed_at ? (
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

									{/* Auto-sync toggle - only visible when ML model is active */}
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

			{/* Confirmation dialog for project removal */}
			<AlertDialog
				open={showRemovalConfirm}
				onOpenChange={setShowRemovalConfirm}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("config.warnings.projectsRemovedTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("config.warnings.projectsRemovedDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("config.warnings.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								setShowRemovalConfirm(false);
								performSync();
							}}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{t("config.warnings.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
