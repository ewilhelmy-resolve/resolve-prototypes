import { AlertCircle, AlertTriangle, CheckCircle2, InfoIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "warning" | "error" | "success";

interface StatusAlertProps {
	/** Alert variant determines color and icon */
	variant?: AlertVariant;
	/** Main content of the alert (can be string or React nodes) */
	children: React.ReactNode;
	/** Additional CSS classes for the alert container */
	className?: string;
	/** Icon size (defaults to "size-4") */
	iconSize?: string;
	/** Optional title for the alert */
	title?: string;
	/** Optional action element (button) displayed on the right */
	action?: React.ReactNode;
}

/**
 * StatusAlert - A unified alert component with multiple variants
 *
 * Supports info, warning, error, and success states with appropriate colors and icons.
 * Replaces the old InfoAlert component with more flexibility.
 *
 * @example
 * // Info alert (blue)
 * <StatusAlert variant="info">
 *   <p>All new users will be assigned the <span className="font-semibold">User</span> role by default.</p>
 * </StatusAlert>
 *
 * @example
 * // Warning alert (amber)
 * <StatusAlert variant="warning">
 *   <p>Your session will expire in 5 minutes.</p>
 * </StatusAlert>
 *
 * @example
 * // Error alert (red)
 * <StatusAlert variant="error">
 *   <p>Failed to save your changes. Please try again.</p>
 * </StatusAlert>
 *
 * @example
 * // Success alert (green)
 * <StatusAlert variant="success">
 *   <p>Your changes have been saved successfully.</p>
 * </StatusAlert>
 */
export function StatusAlert({
	variant = "info",
	children,
	className,
	iconSize = "size-4",
	title,
	action,
}: StatusAlertProps) {
	// Determine icon based on variant
	const Icon = {
		info: InfoIcon,
		warning: AlertTriangle,
		error: AlertCircle,
		success: CheckCircle2,
	}[variant];

	// Determine styling based on variant
	const variantStyles = {
		info: "bg-blue-50 border-blue-200 text-blue-900",
		warning: "bg-amber-50 border-amber-200 text-amber-900",
		error: "bg-red-50 border-red-200 text-red-900",
		success: "bg-green-50 border-green-200 text-green-900",
	}[variant];

	const iconStyles = {
		info: "text-blue-600",
		warning: "text-amber-600",
		error: "text-red-600",
		success: "text-green-600",
	}[variant];

	return (
		<Alert
			className={cn(
				"w-full flex items-start gap-2 border-1",
				variantStyles,
				className
			)}
		>
			<Icon className={cn(iconSize, iconStyles, "flex-shrink-0")} />
			<AlertDescription className="flex-1">
				{title && (
					<p className="font-semibold mb-1">{title}</p>
				)}
				{children}
			</AlertDescription>
			{action && (
				<div className="flex-shrink-0 ml-2 text-black">{action}</div>
			)}
		</Alert>
	);
}

/**
 * InfoAlert - Backwards compatibility wrapper for StatusAlert
 * @deprecated Use StatusAlert with variant="info" instead
 */
export function InfoAlert({
	children,
	className,
	iconSize = "size-4",
}: Omit<StatusAlertProps, "variant">) {
	return (
		<StatusAlert variant="info" className={className} iconSize={iconSize}>
			{children}
		</StatusAlert>
	);
}
