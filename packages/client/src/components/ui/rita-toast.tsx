import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastProps {
	id: string | number;
	variant: ToastVariant;
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

const variantConfig = {
	success: {
		icon: CheckCircle2,
		containerClass: "bg-card border border-green-500",
		iconClass: "text-green-600 dark:text-green-400",
		titleClass: "text-card-foreground",
		descClass: "text-muted-foreground",
		buttonClass:
			"bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
	},
	error: {
		icon: XCircle,
		containerClass: "bg-card border border-destructive",
		iconClass: "text-destructive",
		titleClass: "text-card-foreground",
		descClass: "text-muted-foreground",
		buttonClass:
			"bg-destructive/10 text-destructive hover:bg-destructive/20",
	},
	warning: {
		icon: AlertCircle,
		containerClass: "bg-card border border-yellow-500",
		iconClass: "text-yellow-600 dark:text-yellow-400",
		titleClass: "text-card-foreground",
		descClass: "text-muted-foreground",
		buttonClass:
			"bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400",
	},
	info: {
		icon: Info,
		containerClass: "bg-card border border-blue-500",
		iconClass: "text-blue-600 dark:text-blue-400",
		titleClass: "text-card-foreground",
		descClass: "text-muted-foreground",
		buttonClass:
			"bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
	},
};

/**
 * Custom toast component that maintains Sonner animations and interactions
 * Fully styled with Tailwind, supporting dark mode
 */
function RitaToast(props: ToastProps) {
	const { title, description, action, variant, id } = props;
	const { t } = useTranslation("common");

	const config = variantConfig[variant];
	const Icon = config.icon;

	return (
		<div
			className={cn(
				"flex rounded-lg shadow-lg ring-1 ring-black/5 w-full md:max-w-[364px] items-center p-4 gap-3",
				config.containerClass,
			)}
		>
			<div className="flex flex-1 items-center gap-3">
				<Icon className={cn("h-5 w-5 flex-shrink-0", config.iconClass)} />
				<div className="w-full min-w-0">
					<p className={cn("text-sm font-medium", config.titleClass)}>{title}</p>
					{description && (
						<p className={cn("mt-1 text-sm", config.descClass)}>{description}</p>
					)}
				</div>
			</div>
			{action && (
				<div className="ml-5 shrink-0">
					<button
						className={cn(
							"rounded px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer",
							config.buttonClass,
						)}
						onClick={() => {
							action.onClick();
							sonnerToast.dismiss(id);
						}}
					>
						{action.label}
					</button>
				</div>
			)}
			<button
				className="ml-auto shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2"
				onClick={() => sonnerToast.dismiss(id)}
				aria-label={t("accessibility.closeNotification")}
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}

/**
 * Abstracted toast functions for easy usage throughout the app
 * Using toast.custom() to maintain Sonner animations while having full style control
 *
 * @example
 * // Simple error toast
 * ritaToast.error({ title: "Failed to update", description: "Please try again" })
 *
 * // Toast with action button
 * ritaToast.success({
 *   title: "Profile updated",
 *   description: "Your changes have been saved",
 *   action: { label: "View", onClick: () => navigate("/profile") }
 * })
 */
export const ritaToast = {
	success: (props: Omit<ToastProps, "id" | "variant">) => {
		return sonnerToast.custom((id) => (
			<RitaToast id={id} variant="success" {...props} />
		));
	},

	error: (props: Omit<ToastProps, "id" | "variant">) => {
		return sonnerToast.custom((id) => (
			<RitaToast id={id} variant="error" {...props} />
		));
	},

	warning: (props: Omit<ToastProps, "id" | "variant">) => {
		return sonnerToast.custom((id) => (
			<RitaToast id={id} variant="warning" {...props} />
		));
	},

	info: (props: Omit<ToastProps, "id" | "variant">) => {
		return sonnerToast.custom((id) => (
			<RitaToast id={id} variant="info" {...props} />
		));
	},
};
