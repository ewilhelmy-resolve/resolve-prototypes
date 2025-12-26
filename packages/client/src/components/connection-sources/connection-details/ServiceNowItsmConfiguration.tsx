"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
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
import { formatRelativeTime, STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { useSyncTickets, useCancelIngestion, useLatestIngestionRun } from "@/hooks/useDataSources";
import { ritaToast } from "@/components/ui/rita-toast";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";

const TIME_RANGE_OPTIONS = [
	{ label: "Last 30 days", value: "30" },
	{ label: "Last 60 days", value: "60" },
	{ label: "Last 90 days", value: "90" },
];

interface ServiceNowItsmConfigurationProps {
	onEdit?: () => void;
}

export default function ServiceNowItsmConfiguration({
	onEdit,
}: ServiceNowItsmConfigurationProps = {}) {
	const { source } = useConnectionSource();
	const syncTickets = useSyncTickets();
	const cancelMutation = useCancelIngestion();
	const [selectedTimeRange, setSelectedTimeRange] = useState("30");

	// Track ticket sync status via ingestion runs (separate from knowledge sync)
	const { data: latestIngestionRun } = useLatestIngestionRun(source.backendData?.id);
	const isTicketSyncing = latestIngestionRun?.status === "running" || latestIngestionRun?.status === "pending";

	const isVerifying = source.status.toLowerCase() === STATUS.VERIFYING.toLowerCase();

	const isSyncButtonDisabled = isTicketSyncing || isVerifying || syncTickets.isPending;
	const isCancelButtonDisabled = cancelMutation.isPending;

	const handleSyncTickets = async () => {
		if (!source.backendData) {
			ritaToast.error({
				title: "Configuration Error",
				description: "No backend data available for this source",
			});
			return;
		}

		try {
			await syncTickets.mutateAsync({
				id: source.backendData.id,
				timeRangeDays: parseInt(selectedTimeRange, 10),
			});

			ritaToast.success({
				title: "Sync Started",
				description: "Your ServiceNow tickets are being synced",
			});
		} catch (error) {
			ritaToast.error({
				title: "Sync Failed",
				description:
					error instanceof Error ? error.message : "Failed to start sync",
			});
		}
	};

	const handleCancelSync = async () => {
		if (!source.backendData) {
			ritaToast.error({
				title: "Configuration Error",
				description: "No backend data available for this source",
			});
			return;
		}

		try {
			await cancelMutation.mutateAsync(source.backendData.id);

			ritaToast.success({
				title: "Sync Cancelled",
				description: "Your sync operation has been cancelled",
			});
		} catch (error) {
			ritaToast.error({
				title: "Cancel Failed",
				description:
					error instanceof Error ? error.message : "Failed to cancel sync",
			});
		}
	};

	return (
		<div className="w-full flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<div className="flex justify-between items-start gap-2">
					<FormSectionTitle title="ServiceNow ITSM configuration" />
					<ConnectionActionsMenu onEdit={onEdit} />
				</div>

				<ConnectionStatusCard
					source={source}
					onRetry={handleSyncTickets}
					hideStatusMessage
				/>

				{/* ITSM Sync Section - show when connected and not verifying */}
				{source.status.toLowerCase() !== STATUS.ERROR.toLowerCase() &&
					!isVerifying && (
					<div className="flex flex-col gap-1">
						<div className="border border-border bg-popover rounded-md p-4">
							<div className="rounded-lg flex flex-col gap-4">
								{/* Import tickets controls */}
								<div>
									<Label className="mb-2">
										Import tickets from the last:
									</Label>
									<div className="flex flex-col md:flex-row items-start gap-4 mt-2">
										<div className="md:flex-1 w-full">
											<Select
												value={selectedTimeRange}
												onValueChange={setSelectedTimeRange}
												disabled={isTicketSyncing}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select time range" />
												</SelectTrigger>
												<SelectContent>
													{TIME_RANGE_OPTIONS.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
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
												{cancelMutation.isPending ? "Cancelling..." : "Cancel Sync"}
											</Button>
										) : (
											<Button
												onClick={handleSyncTickets}
												disabled={isSyncButtonDisabled}
												className="w-full md:w-fit"
												variant="default"
											>
												{syncTickets.isPending ? "Importing..." : "Import tickets"}
											</Button>
										)}
									</div>
								</div>

								{/* Progress / Last sync info */}
								<div className="border-t border-border pt-4">
									{isTicketSyncing ? (
										// Show progress when syncing
										latestIngestionRun?.metadata?.progress?.total_estimated ? (
											<div className="flex items-center gap-3">
												<Progress
													value={(latestIngestionRun.records_processed / latestIngestionRun.metadata.progress.total_estimated) * 100}
													className="flex-1"
												/>
												<span className="text-sm text-muted-foreground whitespace-nowrap">
													{latestIngestionRun.records_processed} of {latestIngestionRun.metadata.progress.total_estimated} tickets
												</span>
											</div>
										) : (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Loader2 className="h-4 w-4 animate-spin" />
												Importing tickets...
											</div>
										)
									) : (
										// Show last sync info when not syncing
										latestIngestionRun?.completed_at ? (
											<p className="text-sm text-muted-foreground">
												Last synced {formatRelativeTime(latestIngestionRun.completed_at)}
												{latestIngestionRun.records_processed > 0 && (
													<span> · {latestIngestionRun.records_processed} tickets</span>
												)}
												{latestIngestionRun.records_failed > 0 && (
													<Tooltip>
														<TooltipTrigger asChild>
															<AlertCircle className="h-4 w-4 text-amber-500 inline ml-1 cursor-help" />
														</TooltipTrigger>
														<TooltipContent className="max-w-[250px]">
															{latestIngestionRun.records_failed} tickets couldn't sync.
															Common causes: missing fields, permissions, or API limits.
															Excluded from analysis.
														</TooltipContent>
													</Tooltip>
												)}
											</p>
										) : (
											<p className="text-sm text-muted-foreground">
												No tickets imported yet
											</p>
										)
									)}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
