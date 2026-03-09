"use client";

import { useTranslation } from "react-i18next";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { ConfigurationHeader } from "../ConfigurationHeader";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import { SyncErrorAlert } from "../SyncErrorAlert";

interface SharePointConfigurationProps {
	onEdit?: () => void;
}

export default function SharePointConfiguration({
	onEdit,
}: SharePointConfigurationProps = {}) {
	const { t } = useTranslation("connections");
	const { source } = useConnectionSource();
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<ConfigurationHeader
					title={t("config.titles.sharepoint")}
					onEdit={onEdit}
				/>
				<ConnectionStatusCard source={source} />
				{/* Sync error/warning alert */}
				<SyncErrorAlert backendData={source.backendData} onReVerify={onEdit} />
			</div>
		</div>
	);
}
