"use client";

import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	KNOWLEDGE_SOURCES_ORDER,
	SOURCES,
} from "@/constants/connectionSources";
import SourcesListPage from "./SourcesListPage";

export default function KnowledgeSources() {
	const { t } = useTranslation("settings");

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
			enabledSources={KNOWLEDGE_SOURCES_ORDER}
			basePath="/settings/connections/knowledge"
			iconOverrides={{
				[SOURCES.WEB_SEARCH]: <Globe className="h-5 w-5 flex-shrink-0" />,
			}}
		/>
	);
}
