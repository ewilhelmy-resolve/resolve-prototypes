"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { ritaToast } from "@/components/ui/rita-toast";
import { Switch } from "@/components/ui/switch";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useUpdateDataSource } from "@/hooks/useDataSources";

interface AutoSyncToggleProps {
	connectionId: string;
	currentValue: boolean;
	disabled?: boolean;
}

/**
 * Auto-sync toggle for ITSM connections.
 * Only visible when an active ML model exists.
 * Uses optimistic UI with instant save.
 */
export function AutoSyncToggle({
	connectionId,
	currentValue,
	disabled = false,
}: AutoSyncToggleProps) {
	const { t } = useTranslation("connections");
	const { data: activeModel } = useActiveModel();
	const updateMutation = useUpdateDataSource();
	const [optimisticValue, setOptimisticValue] = useState(currentValue);

	// Only show when ML model is active
	if (!activeModel) {
		return null;
	}

	const handleToggle = async (checked: boolean) => {
		// Optimistic update
		const previousValue = optimisticValue;
		setOptimisticValue(checked);

		try {
			await updateMutation.mutateAsync({
				id: connectionId,
				data: { auto_sync: checked },
			});
		} catch (error) {
			// Rollback on error
			setOptimisticValue(previousValue);
			ritaToast.error({
				title: t("config.autoSync.error"),
				description:
					error instanceof Error ? error.message : t("config.autoSync.error"),
			});
		}
	};

	return (
		<div className="border-t border-border pt-4 mt-4">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<Label htmlFor="auto-sync-toggle" className="text-sm font-medium">
						{t("config.autoSync.label")}
					</Label>
					<p className="text-sm text-muted-foreground">
						{t("config.autoSync.description")}
					</p>
				</div>
				<Switch
					id="auto-sync-toggle"
					checked={optimisticValue}
					onCheckedChange={handleToggle}
					disabled={disabled || updateMutation.isPending}
					aria-label={t("config.autoSync.label")}
				/>
			</div>
		</div>
	);
}
