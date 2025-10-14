"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useTriggerSync,
	useUpdateDataSource,
} from "@/hooks/useDataSources";
import {
	parseAvailableSpaces,
	parseSelectedSpaces,
} from "@/lib/dataSourceUtils";
import { toast } from "@/lib/toast";
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
	const { source } = useConnectionSource();
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
	const updateMutation = useUpdateDataSource();
	const syncMutation = useTriggerSync();

	const isSyncButtonDisabled =
		source.status.toLowerCase() === STATUS.SYNCING.toLowerCase() ||
		source.status.toLowerCase() === STATUS.VERIFYING.toLowerCase() ||
		updateMutation.isPending ||
		syncMutation.isPending;

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
			toast.error("Configuration Error", {
				description: "No backend data available for this source",
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

			toast.success("Sync Started", {
				description: "Your Confluence spaces are being synced",
			});
		} catch (error) {
			toast.error("Sync Failed", {
				description:
					error instanceof Error ? error.message : "Failed to start sync",
			});
		}
	};

	return (
		<div className="w-full flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<div className="flex justify-between items-start gap-2">
					<FormSectionTitle title="Confluence configuration" />
					<ConnectionActionsMenu onEdit={onEdit} />
				</div>

				<ConnectionStatusCard source={source} onRetry={handleSync} />

				<div className="flex flex-col gap-1">
					<div className="border border-border bg-popover rounded-md p-4">
						<div className="rounded-lg">
							<Label className="mb-2">
								Which spaces would you like to sync from?
							</Label>
							<div className="flex flex-col md:flex-row items-start gap-4">
								<div className="md:flex-1 w-full">
									<MultiSelect
										animationConfig={{ optionHoverAnimation: "none" }}
										options={availableSpaces}
										defaultValue={selectedSpaces}
										onValueChange={setSelectedSpaces}
										placeholder="Choose spaces..."
										searchable={true}
										emptyIndicator="No spaces found."
									/>
								</div>
								<Button
									onClick={handleSync}
									disabled={isSyncButtonDisabled}
									className="w-full md:w-fit"
									variant="default"
								>
									{updateMutation.isPending || syncMutation.isPending
										? "Syncing..."
										: "Sync"}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
