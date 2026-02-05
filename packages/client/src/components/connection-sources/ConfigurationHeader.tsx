import { ConnectionActionsMenu } from "./ConnectionActionsMenu";

interface ConfigurationHeaderProps {
	title: string;
	onEdit?: () => void;
	onDisconnect?: () => void;
}

/**
 * Reusable header for connection configuration views
 * Displays title with actions menu (Edit, Disconnect)
 */
export function ConfigurationHeader({
	title,
	onEdit,
	onDisconnect,
}: ConfigurationHeaderProps) {
	return (
		<div className="flex justify-between items-start gap-2">
			<div className="flex items-center gap-2">
				<h4 className="text-xl font-medium text-foreground">
					{title} configuration
				</h4>
			</div>
			<ConnectionActionsMenu onEdit={onEdit} onDisconnect={onDisconnect} />
		</div>
	);
}
