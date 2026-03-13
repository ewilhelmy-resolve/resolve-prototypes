"use client";

import { Globe } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	KNOWLEDGE_SOURCES_ORDER,
	SOURCES,
} from "@/constants/connectionSources";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import SourcesListPage from "./SourcesListPage";

export default function KnowledgeSources() {
	const { t } = useTranslation("settings");
	const isServiceNowEnabled = useFeatureFlag("ENABLE_SERVICENOW");

	const enabledKbSources: string[] = useMemo(
		() =>
			isServiceNowEnabled
				? [SOURCES.CONFLUENCE, SOURCES.SERVICENOW]
				: [SOURCES.CONFLUENCE],
		[isServiceNowEnabled],
	);

	return (
		<SourcesListPage
			title={t("knowledgeSources.title")}
			description={t("knowledgeSources.description")}
			loadingText={t("knowledgeSources.loading")}
			errorTitle={t("errors.loadDataSourcesFailed")}
			errorDescription={t("errors.loadDataSourcesDescription")}
			errorAction={t("errors.tryAgain")}
			configureLabel={t("knowledgeSources.configure")}
			manageLabel={t("knowledgeSources.manage")}
			comingSoonLabel={t("knowledgeSources.comingSoon")}
			lastSyncLabel={t("knowledgeSources.lastSync", { time: "{time}" })}
			sourcesOrder={KNOWLEDGE_SOURCES_ORDER}
			enabledSources={enabledKbSources}
			basePath="/settings/connections/knowledge"
			iconOverrides={{
				[SOURCES.WEB_SEARCH]: <Globe className="h-5 w-5 flex-shrink-0" />,
			}}
		/>
	);
}
