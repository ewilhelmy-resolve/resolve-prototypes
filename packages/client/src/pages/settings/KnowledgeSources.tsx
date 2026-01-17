"use client";

import { Globe } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CrashPage } from "@/components/CrashPage";
import { SourceListCard } from "@/components/connection-sources/SourceListCard";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import {
	KNOWLEDGE_SOURCES_ORDER,
	mapDataSourceToUI,
	SOURCES,
	STATUS,
} from "@/constants/connectionSources";
import { useDataSources, useSeedDataSources } from "@/hooks/useDataSources";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import SettingsHeader from "./SettingsHeader";

export default function KnowledgeSources() {
	const { t } = useTranslation("settings");
	const { mutate: seedSources, isPending: isSeeding } = useSeedDataSources();
	const { data: dataSources, isLoading, error } = useDataSources();
	const isServiceNowEnabled = useFeatureFlag("ENABLE_SERVICENOW");

	// Sources that are clickable (configured for KB sync)
	const enabledKbSources: string[] = isServiceNowEnabled
		? [SOURCES.CONFLUENCE, SOURCES.SERVICENOW]
		: [SOURCES.CONFLUENCE];

	// Seed on mount (idempotent - safe to call multiple times)
	useEffect(() => {
		seedSources();
	}, [seedSources]);

	// Map backend data to UI format, filter to knowledge sources, and sort
	const uiSources = useMemo(() => {
		if (!dataSources) return [];

		// Filter to knowledge source types and map
		const mapped = dataSources
			.filter((ds) => KNOWLEDGE_SOURCES_ORDER.includes(ds.type))
			.map(mapDataSourceToUI);

		// Sort by defined order
		return mapped.sort((a, b) => {
			const indexA = KNOWLEDGE_SOURCES_ORDER.indexOf(a.type);
			const indexB = KNOWLEDGE_SOURCES_ORDER.indexOf(b.type);
			return indexA - indexB;
		});
	}, [dataSources]);

	if (isLoading || isSeeding) {
		return (
			<RitaSettingsLayout>
				<div className="w-full">
					<div className="flex flex-col gap-8">
						<SettingsHeader
							title={t("knowledgeSources.title")}
							description={t("knowledgeSources.description")}
						/>
						<div className="max-w-6xl">
							<div className="text-center py-8">{t("knowledgeSources.loading")}</div>
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
						title={t("knowledgeSources.title")}
						description={t("knowledgeSources.description")}
					/>
				</div>

				<div className="px-6 pb-8 max-w-2xl mx-auto w-full">
				{uiSources.map((source) => {
					const isEnabled = enabledKbSources.includes(source.type);

					const cardContent = (
						<SourceListCard
							source={source}
							isEnabled={isEnabled}
							actionLabel={
								source.status === STATUS.NOT_CONNECTED
									? t("knowledgeSources.configure")
									: t("knowledgeSources.manage")
							}
							disabledLabel={t("knowledgeSources.comingSoon")}
							lastSyncLabel={t("knowledgeSources.lastSync", { time: "{time}" })}
							icon={
								source.type === SOURCES.WEB_SEARCH ? (
									<Globe className="h-5 w-5 flex-shrink-0" />
								) : undefined
							}
						/>
					);

					// Only wrap enabled sources with Link
					if (isEnabled) {
						return (
							<Link
								key={source.id}
								to={`/settings/connections/knowledge/${source.id}`}
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
