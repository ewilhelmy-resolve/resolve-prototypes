"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { MultiSelect, type MultiSelectOption } from "../../custom/multi-select";

interface KbSyncSectionProps {
	source: ConnectionSource;
	/** Label for the MultiSelect (e.g. "Which spaces?" / "Which knowledge bases?") */
	label: string;
	options: MultiSelectOption[];
	selectedValues: string[];
	onSelectedChange: (values: string[]) => void;
	placeholder: string;
	emptyIndicator: string;
	onSync: () => void;
	onCancelSync: () => void;
	isSyncDisabled: boolean;
	isSyncing: boolean;
	isSyncPending: boolean;
	isCancelPending: boolean;
	/** Label shown during syncing (e.g. "Syncing...") */
	syncingLabel: string;
	/** Label for the sync button (e.g. "Sync") */
	syncLabel: string;
	/** Label shown during cancel (e.g. "Cancelling...") */
	cancellingLabel: string;
	/** Label for cancel button (e.g. "Cancel Sync") */
	cancelSyncLabel: string;
	/** Label for in-progress state (e.g. "Sync in progress...") */
	inProgressLabel: string;
}

export default function KbSyncSection({
	source,
	label,
	options,
	selectedValues,
	onSelectedChange,
	placeholder,
	emptyIndicator,
	onSync,
	onCancelSync,
	isSyncDisabled,
	isSyncing,
	isSyncPending,
	isCancelPending,
	syncingLabel,
	syncLabel,
	cancellingLabel,
	cancelSyncLabel,
	inProgressLabel,
}: KbSyncSectionProps) {
	const isVerifying =
		source.status.toLowerCase() === STATUS.VERIFYING.toLowerCase();

	return (
		<>
			{/* Show cancel button when syncing */}
			{isSyncing && (
				<div className="flex flex-col gap-1">
					<div className="border border-border bg-popover rounded-md p-4">
						<div className="rounded-lg flex items-center justify-between">
							<Label>{inProgressLabel}</Label>
							<Button
								onClick={onCancelSync}
								disabled={isCancelPending}
								variant="destructive"
							>
								{isCancelPending ? cancellingLabel : cancelSyncLabel}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Selector + Sync button when not in error/verifying/syncing state */}
			{source.status.toLowerCase() !== STATUS.ERROR.toLowerCase() &&
				!isVerifying &&
				!isSyncing && (
					<div className="flex flex-col gap-1">
						<div className="border border-border bg-popover rounded-md p-4">
							<div className="rounded-lg">
								<Label className="mb-2">{label}</Label>
								<div className="flex flex-col md:flex-row items-start gap-4">
									<div className="md:flex-1 w-full">
										<MultiSelect
											animationConfig={{ optionHoverAnimation: "none" }}
											options={options}
											defaultValue={selectedValues}
											onValueChange={onSelectedChange}
											placeholder={placeholder}
											searchable={true}
											emptyIndicator={emptyIndicator}
										/>
									</div>
									<Button
										onClick={onSync}
										disabled={isSyncDisabled}
										className="w-full md:w-fit"
										variant="default"
									>
										{isSyncPending ? syncingLabel : syncLabel}
									</Button>
								</div>
							</div>
						</div>
					</div>
				)}
		</>
	);
}
