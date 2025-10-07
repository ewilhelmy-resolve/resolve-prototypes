"use client";

import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { ConnectionStatusCard } from "../ConnectionStatusCard";

interface WebSearchConfigurationProps {
	onEdit?: () => void;
}

export default function WebSearchConfiguration({
	onEdit,
}: WebSearchConfigurationProps = {}) {
	const { source } = useConnectionSource();
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<div className="flex justify-between items-start gap-2">
					<div className="flex items-center gap-2">
						<h4 className="text-xl font-medium text-foreground">
							Web Search configuration
						</h4>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<EllipsisVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
							<DropdownMenuItem className="text-destructive">
								Disconnect
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<ConnectionStatusCard source={source} />
			</div>
		</div>
	);
}
