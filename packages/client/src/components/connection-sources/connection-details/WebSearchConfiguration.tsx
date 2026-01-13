"use client";

import { useTranslation } from "react-i18next";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { ConfigurationHeader } from "../ConfigurationHeader";
import { ConnectionStatusCard } from "../ConnectionStatusCard";

interface WebSearchConfigurationProps {
	onEdit?: () => void;
}

export default function WebSearchConfiguration({
	onEdit,
}: WebSearchConfigurationProps = {}) {
	const { t } = useTranslation("connections");
	const { source } = useConnectionSource();
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<ConfigurationHeader title={t("config.titles.websearch")} onEdit={onEdit} />
				<ConnectionStatusCard source={source} />
			</div>
		</div>
	);
}
