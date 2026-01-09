import { EllipsisVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation("common");
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{onEdit && (
					<DropdownMenuItem onClick={onEdit}>{t("actions.edit")}</DropdownMenuItem>
				)}
				{onDisconnect && (
					<DropdownMenuItem className="text-destructive" onClick={onDisconnect}>
						{t("actions.disconnect")}
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
