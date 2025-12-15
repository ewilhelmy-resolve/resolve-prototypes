"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { useSyncTickets, useCancelSync } from "@/hooks/useDataSources";
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
	const cancelMutation = useCancelSync();
	const [selectedTimeRange, setSelectedTimeRange] = useState("30");

	const isSyncing = source.status.toLowerCase() === STATUS.SYNCING.toLowerCase();
	const isVerifying = source.status.toLowerCase() === STATUS.VERIFYING.toLowerCase();

	const isSyncButtonDisabled = isSyncing || isVerifying || syncTickets.isPending;
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

				<ConnectionStatusCard source={source} onRetry={handleSyncTickets} />

				{/* Show cancel button when syncing */}
				{isSyncing && (
					<div className="flex flex-col gap-1">
						<div className="border border-border bg-popover rounded-md p-4">
							<div className="rounded-lg flex items-center justify-between">
								<Label>Sync in progress...</Label>
								<Button
									onClick={handleCancelSync}
									disabled={isCancelButtonDisabled}
									variant="destructive"
								>
									{cancelMutation.isPending ? "Cancelling..." : "Cancel Sync"}
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* ITSM Sync Section - show when not error, verifying, or syncing */}
				{source.status.toLowerCase() !== STATUS.ERROR.toLowerCase() &&
					!isVerifying &&
					!isSyncing && (
					<div className="flex flex-col gap-1">
						<div className="border border-border bg-popover rounded-md p-4">
							<div className="rounded-lg">
								<Label className="mb-2">
									Import tickets from the last:
								</Label>
								<div className="flex flex-col md:flex-row items-start gap-4 mt-2">
									<div className="md:flex-1 w-full">
										<Select
											value={selectedTimeRange}
											onValueChange={setSelectedTimeRange}
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
									<Button
										onClick={handleSyncTickets}
										disabled={isSyncButtonDisabled}
										className="w-full md:w-fit"
										variant="default"
									>
										{syncTickets.isPending ? "Syncing..." : "Sync Tickets"}
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
