"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StatusAlert } from "@/components/ui/status-alert";
import { ITSM_SOURCES_ORDER, SOURCES } from "@/constants/connectionSources";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import SourcesListPage from "./SourcesListPage";

export default function ItsmSources() {
	const { t } = useTranslation("settings");
	const isServiceNowEnabled = useFeatureFlag("ENABLE_SERVICENOW");
	const isJiraEnabled = useFeatureFlag("ENABLE_JIRA");
	const isIvantiEnabled = useFeatureFlag("ENABLE_IVANTI");
	const isFreshserviceEnabled = useFeatureFlag("ENABLE_FRESHSERVICE");

	const { data: activeModel } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const isTraining = trainingState === "in_progress";

	const enabledItsmSources: string[] = useMemo(
		() => [
			...(isServiceNowEnabled ? [SOURCES.SERVICENOW_ITSM] : []),
			...(isJiraEnabled ? [SOURCES.JIRA_ITSM] : []),
			...(isIvantiEnabled ? [SOURCES.IVANTI_ITSM] : []),
			...(isFreshserviceEnabled ? [SOURCES.FRESHSERVICE] : []),
		],
		[
			isServiceNowEnabled,
			isJiraEnabled,
			isIvantiEnabled,
			isFreshserviceEnabled,
		],
	);

	return (
		<SourcesListPage
			title={t("itsmSources.title")}
			description={t("itsmSources.description")}
			loadingText={t("itsmSources.loading")}
			errorTitle={t("errors.loadDataSourcesFailed")}
			errorDescription={t("errors.loadDataSourcesDescription")}
			errorAction={t("errors.tryAgain")}
			configureLabel={t("itsmSources.configure")}
			manageLabel={t("itsmSources.manage")}
			comingSoonLabel={t("itsmSources.comingSoon")}
			lastSyncLabel={t("itsmSources.lastSync", { time: "{time}" })}
			sourcesOrder={ITSM_SOURCES_ORDER}
			enabledSources={enabledItsmSources}
			basePath="/settings/connections/itsm"
			createPlaceholders
			headerContent={
				isTraining ? (
					<div className="mb-6">
						<StatusAlert
							variant="info"
							title={t("itsmSources.trainingInProgress")}
						>
							<p>{t("itsmSources.trainingDescription")}</p>
						</StatusAlert>
					</div>
				) : undefined
			}
		/>
	);
}
