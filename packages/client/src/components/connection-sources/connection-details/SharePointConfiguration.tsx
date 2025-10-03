"use client";

import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { ConnectionStatusCard } from "../ConnectionStatusCard";

export default function SharePointConfiguration() {
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
					<Button variant="ghost" size="icon">
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</div>

				<ConnectionStatusCard source={source} />
			</div>
		</div>
	);
}
