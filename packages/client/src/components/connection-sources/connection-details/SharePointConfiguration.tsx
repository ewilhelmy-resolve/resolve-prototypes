"use client";

import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { ConfigurationHeader } from "../ConfigurationHeader";
import { ConnectionStatusCard } from "../ConnectionStatusCard";

interface SharePointConfigurationProps {
	onEdit?: () => void;
}

export default function SharePointConfiguration({
	onEdit,
}: SharePointConfigurationProps = {}) {
	const { source } = useConnectionSource();
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<ConfigurationHeader title="SharePoint" onEdit={onEdit} />
				<ConnectionStatusCard source={source} />
			</div>
		</div>
	);
}
