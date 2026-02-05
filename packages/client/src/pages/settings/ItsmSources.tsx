"use client";

import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CrashPage } from "@/components/CrashPage";
import { SourceListCard } from "@/components/connection-sources/SourceListCard";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import { StatusAlert } from "@/components/ui/status-alert";
import {
	ITSM_SOURCES_ORDER,
	mapDataSourceToUI,
	SOURCE_METADATA,
	SOURCES,
	STATUS,
} from "@/constants/connectionSources";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useDataSources, useSeedDataSources } from "@/hooks/useDataSources";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import SettingsHeader from "./SettingsHeader";

export default function ItsmSources() {
	const { t } = useTranslation("settings");
	const { mutate: seedSources, isPending: isSeeding } = useSeedDataSources();
	const { data: dataSources, isLoading, error } = useDataSources();
	const isServiceNowEnabled = useFeatureFlag("ENABLE_SERVICENOW");
	const isJiraEnabled = useFeatureFlag("ENABLE_JIRA");

	// Check training state for banner
	const { data: activeModel } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const isTraining = trainingState === "in_progress";

	// Sources that are clickable (configured for ITSM sync)
	const enabledItsmSources: string[] = [
		...(isServiceNowEnabled ? [SOURCES.SERVICENOW_ITSM] : []),
		...(isJiraEnabled ? [SOURCES.JIRA_ITSM] : []),
	];

	// Seed on mount (idempotent - safe to call multiple times)
	useEffect(() => {
		seedSources();
	}, [seedSources]);

	// Map backend data to UI format, filter to ITSM sources, and sort
	// For sources not in backend (like jira), create placeholder entries
	const uiSources = useMemo(() => {
		if (!dataSources) return [];

		// Get existing ITSM sources from backend
		const existingSources = dataSources
			.filter((ds) => ITSM_SOURCES_ORDER.includes(ds.type))
			.map(mapDataSourceToUI);

		// Create placeholder for missing ITSM sources (like jira)
		const existingTypes = existingSources.map((s) => s.type);
		const placeholders = ITSM_SOURCES_ORDER.filter(
			(type) => !existingTypes.includes(type),
		).map((type) => ({
			id: `placeholder-${type}`,
			type,
			title: SOURCE_METADATA[type]?.title || type,
			status: STATUS.NOT_CONNECTED,
			description: SOURCE_METADATA[type]?.description,
			badges: [] as string[],
			lastSync: undefined as string | undefined,
		}));

		// Combine and sort by defined order
		const allSources = [...existingSources, ...placeholders];
		return allSources.sort((a, b) => {
			const indexA = ITSM_SOURCES_ORDER.indexOf(a.type);
			const indexB = ITSM_SOURCES_ORDER.indexOf(b.type);
			return indexA - indexB;
		});
	}, [dataSources]);

	if (isLoading || isSeeding) {
		return (
			<RitaSettingsLayout>
				<div className="w-full">
					<div className="flex flex-col gap-8">
						<SettingsHeader
							title={t("itsmSources.title")}
							description={t("itsmSources.description")}
						/>
						<div className="max-w-6xl">
							<div className="text-center py-8">{t("itsmSources.loading")}</div>
						</div>
					</div>
				</div>
			</RitaSettingsLayout>
		);
	}

	if (error) {
		return (
			<RitaSettingsLayout>
				<CrashPage
					title={t("errors.loadDataSourcesFailed")}
					description={t("errors.loadDataSourcesDescription")}
					actionLabel={t("errors.tryAgain")}
					onAction={() => window.location.reload()}
				/>
			</RitaSettingsLayout>
		);
	}

	return (
		<RitaSettingsLayout>
			<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
				<div className="self-stretch flex flex-col items-start gap-8">
					<SettingsHeader
						title={t("itsmSources.title")}
						description={t("itsmSources.description")}
					/>
				</div>

				<div className="px-6 pb-8 max-w-2xl mx-auto w-full">
					{isTraining && (
						<div className="mb-6">
							<StatusAlert
								variant="info"
								title={t("itsmSources.trainingInProgress")}
							>
								<p>{t("itsmSources.trainingDescription")}</p>
							</StatusAlert>
						</div>
					)}
					{uiSources.map((source) => {
						const isEnabled = enabledItsmSources.includes(source.type);
						const isPlaceholder = source.id.startsWith("placeholder-");

						const cardContent = (
							<SourceListCard
								source={source}
								isEnabled={isEnabled}
								isPlaceholder={isPlaceholder}
								actionLabel={
									source.status === STATUS.NOT_CONNECTED
										? t("itsmSources.configure")
										: t("itsmSources.manage")
								}
								disabledLabel={t("itsmSources.comingSoon")}
								lastSyncLabel={t("itsmSources.lastSync", { time: "{time}" })}
							/>
						);

						// Only wrap enabled sources with Link
						if (isEnabled && !isPlaceholder) {
							return (
								<Link
									key={source.id}
									to={`/settings/connections/itsm/${source.id}`}
									className="block mb-5"
								>
									{cardContent}
								</Link>
							);
						}

						// For other sources, just return the card without link
						return (
							<div key={source.id} className="mb-5">
								{cardContent}
							</div>
						);
					})}
				</div>
			</div>
		</RitaSettingsLayout>
	);
}
