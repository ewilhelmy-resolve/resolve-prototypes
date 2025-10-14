import { InfoIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface InfoAlertProps {
	/** Main content of the alert (can be string or React nodes) */
	children: React.ReactNode;
	/** Additional CSS classes for the alert container */
	className?: string;
	/** Icon size (defaults to "size-4") */
	iconSize?: string;
}

/**
 * InfoAlert - A reusable information alert component
 * Displays an info icon with customizable content in a styled alert box
 *
 * @example
 * <InfoAlert>
 *   <p>All new users will be assigned the <span className="font-semibold">User</span> role by default.</p>
 *   <p>To grant admin access, update their role later in Settings → Users.</p>
 * </InfoAlert>
 */
export function InfoAlert({
	children,
	className,
	iconSize = "size-4",
}: InfoAlertProps) {
	return (
		<Alert
			className={cn(
				"w-full bg-primary-foreground flex items-start gap-2 border-1 border-primary",
				className
			)}
		>
			<InfoIcon className={iconSize} />
			<AlertDescription className="flex-1">
				{children}
			</AlertDescription>
		</Alert>
	);
}
