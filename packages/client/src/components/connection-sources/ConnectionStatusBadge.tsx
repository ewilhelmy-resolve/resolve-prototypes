import { CircleCheck, CircleX, HelpCircle, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS, type Status } from "@/constants/connectionSources";

interface ConnectionStatusBadgeProps {
	status: Status;
	/** Override status to show retrying state */
	isRetrying?: boolean;
	/** Override status to show help needed state */
	showHelp?: boolean;
}

/**
 * Badge component for displaying connection status
 * Supports states: Syncing (Testing), Connected, Error (Failed), Not connected
 * Plus override states: Retrying, Need Help
 */
export function ConnectionStatusBadge({
	status,
	isRetrying = false,
	showHelp = false,
}: ConnectionStatusBadgeProps) {
	// Handle override states for error status
	if (status === STATUS.ERROR) {
		if (isRetrying) {
			return (
				<Badge
					variant="outline"
					className="bg-background border-blue-500 gap-1.5 px-3 py-1"
				>
					<Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
					Retrying...
				</Badge>
			);
		}

		if (showHelp) {
			return (
				<Badge
					variant="outline"
					className="bg-background border-orange-500 gap-1.5 px-3 py-1"
				>
					<HelpCircle className="h-3 w-3 text-orange-500" />
					Need Help
				</Badge>
			);
		}
	}

	// Default status rendering
	switch (status) {
		case STATUS.VERIFYING:
			return (
				<Badge
					variant="outline"
					className="bg-background border-blue-500 gap-1.5 px-3 py-1"
				>
					<Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
					Verifying...
				</Badge>
			);
		case STATUS.SYNCING:
			return (
				<Badge
					variant="outline"
					className="bg-background border-blue-500 gap-1.5 px-3 py-1"
				>
					<Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
					Syncing...
				</Badge>
			);
		case STATUS.ERROR:
			return (
				<Badge
					variant="outline"
					className="bg-background border-red-500 gap-1.5 px-3 py-1"
				>
					<CircleX className="h-3 w-3 text-red-500" />
					Failed
				</Badge>
			);
		case STATUS.CANCELLED:
			return (
				<Badge
					variant="outline"
					className="bg-background border-yellow-500 gap-1.5 px-3 py-1"
				>
					<XCircle className="h-3 w-3 text-yellow-500" />
					Cancelled
				</Badge>
			);
		case STATUS.CONNECTED:
			return (
				<Badge
					variant="outline"
					className="bg-background border-green-500 gap-1.5 px-3 py-1"
				>
					<CircleCheck className="h-3 w-3 text-green-500" />
					Connected
				</Badge>
			);
		case STATUS.NOT_CONNECTED:
			return (
				<Badge
					variant="outline"
					className="bg-background border-muted-foreground gap-1.5 px-3 py-1"
				>
					<CircleX className="h-3 w-3 text-muted-foreground" />
					Not connected
				</Badge>
			);
		default:
			return null;
	}
}
