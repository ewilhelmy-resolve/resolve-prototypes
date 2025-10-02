"use client";

import { CircleCheck, EllipsisVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SharePointConfiguration() {
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

				<div className="flex flex-col gap-1">
					<div className="border border-border bg-popover rounded-md p-4">
						<div className="flex items-center gap-4 rounded-lg">
							<div className="flex flex-col gap-0 py-0.5">
								<div className="flex items-center gap-2">
									<small className="text-sm text-muted-foreground">Tenant ID</small>
									<small className="text-sm text-foreground">
										tenant-id-example
									</small>
								</div>
								<div className="flex items-center gap-2">
									<small className="text-sm text-muted-foreground">Client ID</small>
									<small className="text-sm text-foreground">
										client-id-example
									</small>
								</div>
								<div className="flex items-center gap-2">
									<small className="text-sm text-muted-foreground">Site URL</small>
									<small className="text-sm text-foreground">
										https://acme.sharepoint.com
									</small>
								</div>
							</div>

							<div className="flex flex-col justify-center items-center py-0.5">
								<Badge variant="outline" className="border-green-500">
									<CircleCheck className="h-3 w-3 text-green-500" />
									Connected
								</Badge>
							</div>

							<div className="flex flex-col justify-start py-0.5">
								<small className="text-sm text-foreground">
									Updated at 2:09 PM, Today
								</small>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
