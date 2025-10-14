"use client";

import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { ConnectionActionsMenu } from "../ConnectionActionsMenu";
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
				<div className="flex justify-between items-start gap-2">
					<div className="flex items-center gap-2">
						<h4 className="text-xl font-medium text-foreground">
							SharePoint configuration
						</h4>
					</div>
					<ConnectionActionsMenu onEdit={onEdit} />
				</div>

				<ConnectionStatusCard source={source} />
			</div>
		</div>
	);
}
