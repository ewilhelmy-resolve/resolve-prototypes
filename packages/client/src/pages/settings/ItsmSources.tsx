"use client";

import { useTranslation } from "react-i18next";
import { StatusAlert } from "@/components/custom/status-alert";
import { ITSM_SOURCES_ORDER } from "@/constants/connectionSources";
import { useActiveModel } from "@/hooks/useActiveModel";
import SourcesListPage from "./SourcesListPage";

export default function ItsmSources() {
	const { t } = useTranslation("settings");

	const { data: activeModel } = useActiveModel();
	const trainingState = activeModel?.metadata?.training_state;
	const isTraining = trainingState === "in_progress";

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
			enabledSources={ITSM_SOURCES_ORDER}
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
