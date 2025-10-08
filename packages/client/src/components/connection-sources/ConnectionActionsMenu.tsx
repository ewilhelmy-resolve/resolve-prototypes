import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConnectionActionsMenuProps {
	onEdit?: () => void;
	onDisconnect?: () => void;
}

/**
 * Shared dropdown menu for connection actions (Edit, Disconnect)
 * Used across all connection configuration components
 */
export function ConnectionActionsMenu({
	onEdit,
	onDisconnect,
}: ConnectionActionsMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{onEdit && (
					<DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
				)}
				{onDisconnect && (
					<DropdownMenuItem className="text-destructive" onClick={onDisconnect}>
						Disconnect
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
