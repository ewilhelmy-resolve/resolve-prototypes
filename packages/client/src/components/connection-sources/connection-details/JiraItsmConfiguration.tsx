"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { StatusAlert } from "@/components/ui/status-alert";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useLatestIngestionRun,
	useUpdateDataSource,
} from "@/hooks/useDataSources";
import { parseAvailableSpaces } from "@/lib/dataSourceUtils";
import { MultiSelect, type MultiSelectOption } from "../../ui/multi-select";
import ItsmConfigurationBase from "./ItsmConfigurationBase";

interface JiraItsmConfigurationProps {
	onEdit?: () => void;
}

export default function JiraItsmConfiguration({
	onEdit,
}: JiraItsmConfigurationProps = {}) {
	const { t } = useTranslation("connections");
	const { source } = useConnectionSource();
	const updateMutation = useUpdateDataSource();
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
	const [showRemovalConfirm, setShowRemovalConfirm] = useState(false);
	const resolverRef = useRef<((proceed: boolean) => void) | null>(null);

	const availableSpaces: MultiSelectOption[] = useMemo(() => {
		const spaces = parseAvailableSpaces(source.backendData?.latest_options);
		return spaces.map((space) => {
			const [key, name] = space.split(":");
			return name
				? { value: key, label: name }
				: { value: space, label: space };
		});
	}, [source.backendData?.latest_options]);

	const savedProjectKeys: string[] = useMemo(() => {
		const projectKeys = source.backendData?.settings?.project_keys;
		return Array.isArray(projectKeys) ? projectKeys : [];
	}, [source.backendData?.settings]);

	useEffect(() => {
		if (savedProjectKeys.length > 0) {
			setSelectedSpaces(savedProjectKeys);
		}
	}, [savedProjectKeys]);

	const { data: latestIngestionRun } = useLatestIngestionRun(
		source.backendData?.id,
	);
	const isTicketSyncing =
		latestIngestionRun?.status === "running" ||
		latestIngestionRun?.status === "pending";

	const hasSpacesAvailable = availableSpaces.length > 0;
	const hasSpacesSelected = selectedSpaces.length > 0;

	const removedProjects = useMemo(() => {
		if (savedProjectKeys.length === 0) return [];
		return savedProjectKeys.filter((key) => !selectedSpaces.includes(key));
	}, [savedProjectKeys, selectedSpaces]);
	const hasRemovedProjects = removedProjects.length > 0;

	const updateProjectKeys = useCallback(
		async (backendId: string): Promise<boolean> => {
			if (!hasSpacesAvailable || !source.backendData) return true;

			try {
				await updateMutation.mutateAsync({
					id: backendId,
					data: {
						settings: {
							...source.backendData.settings,
							project_keys: selectedSpaces,
						},
					},
				});
				return true;
			} catch {
				return false;
			}
		},
		[hasSpacesAvailable, source.backendData, selectedSpaces, updateMutation],
	);

	const handleBeforeSync = useCallback(
		async (backendId: string): Promise<boolean> => {
			if (hasSpacesAvailable && !hasSpacesSelected) {
				return false;
			}

			// If projects were removed, show confirmation and wait for user decision
			if (hasRemovedProjects) {
				const confirmed = await new Promise<boolean>((resolve) => {
					resolverRef.current = resolve;
					setShowRemovalConfirm(true);
				});

				if (!confirmed) return false;
			}

			return updateProjectKeys(backendId);
		},
		[
			hasSpacesAvailable,
			hasSpacesSelected,
			hasRemovedProjects,
			updateProjectKeys,
		],
	);

	const handleDialogConfirm = () => {
		setShowRemovalConfirm(false);
		resolverRef.current?.(true);
		resolverRef.current = null;
	};

	const handleDialogCancel = () => {
		setShowRemovalConfirm(false);
		resolverRef.current?.(false);
		resolverRef.current = null;
	};

	return (
		<ItsmConfigurationBase
			titleKey="config.titles.jiraItsm"
			syncStartedDescKey="config.toast.syncStartedJiraItsm"
			onEdit={onEdit}
			onBeforeSync={handleBeforeSync}
			isSyncDisabled={hasSpacesAvailable && !hasSpacesSelected}
			isExtraPending={updateMutation.isPending}
			footer={
				<AlertDialog
					open={showRemovalConfirm}
					onOpenChange={(open) => {
						if (!open) handleDialogCancel();
					}}
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
							<AlertDialogCancel onClick={handleDialogCancel}>
								{t("config.warnings.cancel")}
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDialogConfirm}
								className="bg-destructive text-white hover:bg-destructive/90"
							>
								{t("config.warnings.confirm")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			}
		>
			{hasSpacesAvailable && (
				<div>
					<Label className="mb-2">{t("config.labels.projectsQuestion")}</Label>
					<div className="flex flex-col md:flex-row items-start gap-4 mt-2">
						<div className="md:flex-1 w-full">
							<MultiSelect
								animationConfig={{ optionHoverAnimation: "none" }}
								options={availableSpaces}
								defaultValue={selectedSpaces}
								onValueChange={setSelectedSpaces}
								placeholder={t("config.placeholders.chooseProjects")}
								searchable={true}
								emptyIndicator={t("config.placeholders.noProjects")}
								disabled={isTicketSyncing}
							/>
						</div>
					</div>
				</div>
			)}

			{hasRemovedProjects && (
				<StatusAlert
					variant="error"
					title={t("config.warnings.projectsRemovedTitle")}
				>
					<p>{t("config.warnings.projectsRemovedDescription")}</p>
				</StatusAlert>
			)}
		</ItsmConfigurationBase>
	);
}
