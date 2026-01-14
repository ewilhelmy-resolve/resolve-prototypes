import { Loader, Trash2, X } from "lucide-react";
import type React from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BulkAction {
	/** Unique key for the action */
	key: string;
	/** Label for the button */
	label: string;
	/** Icon component to display */
	icon?: ReactNode;
	/** Button variant */
	variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
	/** Click handler */
	onClick: () => void;
	/** Whether the action is disabled */
	disabled?: boolean;
}

interface BulkActionsProps {
	/** Array of selected item IDs or count of selected items */
	selectedItems?: string[] | number;
	/** Legacy count prop for backward compatibility */
	count?: number;
	/** Legacy selectedUsers prop for backward compatibility */
	selectedUsers?: string[];
	/** Array of custom actions to display */
	actions?: BulkAction[];
	/** Legacy delete handler for backward compatibility */
	onDelete?: () => void;
	/** Custom label for delete button (e.g., "Delete", "Cancel Invitation", "Remove") */
	deleteLabel?: string;
	/** Close handler to clear selections */
	onClose: () => void;
	/** Custom label for selected items (e.g., "users", "files", "items") */
	itemLabel?: string;
	/** Additional CSS classes */
	className?: string;
	/** Loading state - disables buttons and shows loading text */
	isLoading?: boolean;
	/** Custom loading label (e.g., "Deleting...") */
	loadingLabel?: string;
	/** Remaining items count during deletion (shown when isLoading is true) */
	remainingCount?: number | null;
}

/**
 * BulkActions - Reusable component for table bulk operations
 *
 * Displays a fixed bottom bar with action buttons when items are selected.
 * Supports custom actions or uses default delete action.
 *
 * @example
 * // Simple usage with delete action
 * <BulkActions
 *   selectedItems={selectedUserIds}
 *   onDelete={handleDelete}
 *   onClose={() => setSelectedUserIds([])}
 *   itemLabel="users"
 * />
 *
 * @example
 * // Custom actions
 * <BulkActions
 *   selectedItems={selectedFileIds}
 *   actions={[
 *     {
 *       key: 'delete',
 *       label: 'Delete',
 *       icon: <Trash2 className="h-4 w-4" />,
 *       variant: 'destructive',
 *       onClick: handleDelete,
 *     },
 *     {
 *       key: 'download',
 *       label: 'Download',
 *       icon: <Download className="h-4 w-4" />,
 *       variant: 'outline',
 *       onClick: handleDownload,
 *     },
 *   ]}
 *   onClose={() => setSelectedFileIds([])}
 *   itemLabel="files"
 * />
 */
export const BulkActions: React.FC<BulkActionsProps> = ({
	selectedItems,
	count: legacyCount,
	selectedUsers,
	actions,
	onDelete,
	deleteLabel,
	onClose,
	itemLabel,
	className,
	isLoading = false,
	loadingLabel,
	remainingCount,
}) => {
	const { t } = useTranslation("common");
	const resolvedDeleteLabel = deleteLabel ?? t("bulk.defaultDeleteLabel");
	const resolvedItemLabel = itemLabel ?? t("bulk.defaultItemLabel");
	const resolvedLoadingLabel = loadingLabel ?? t("bulk.defaultLoadingLabel");
	// Calculate count from various prop sources (backward compatibility)
	const count =
		typeof selectedItems === "number"
			? selectedItems
			: Array.isArray(selectedItems)
				? selectedItems.length
				: Array.isArray(selectedUsers)
					? selectedUsers.length
					: legacyCount || 0;

	// Don't render if no items selected
	if (count === 0) return null;

	// Use custom actions or default to delete action
	const displayActions: BulkAction[] = actions || (onDelete ? [{
		key: 'delete',
		label: isLoading ? resolvedLoadingLabel : resolvedDeleteLabel,
		icon: isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />,
		variant: 'destructive' as const,
		onClick: onDelete,
		disabled: isLoading,
	}] : []);

	return (
		<section
			className={cn(
				"relative flex items-center justify-between",
				"bg-primary-foreground dark:bg-slate-800/50 border border-border rounded-md",
				"px-6 py-4 shadow-sm animate-in fade-in",
				className,
			)}
			aria-label={t("bulk.ariaLabel")}
		>
			<div className="flex items-center gap-4">
				<p className="text-base font-medium text-foreground">
					{isLoading && remainingCount != null
						? t("bulk.remaining", { count: remainingCount, label: remainingCount === 1 ? resolvedItemLabel.replace(/s$/, '') : resolvedItemLabel })
						: t("bulk.selected", { count, label: count === 1 ? resolvedItemLabel.replace(/s$/, '') : resolvedItemLabel })
					}
				</p>

				{displayActions.map((action) => (
					<Button
						key={action.key}
						variant={action.variant || "default"}
						className="flex items-center gap-2"
						onClick={action.onClick}
						disabled={action.disabled || isLoading}
					>
						{action.icon}
						{action.label}
					</Button>
				))}
			</div>

			<button
				type="button"
				onClick={onClose}
				disabled={isLoading}
				className={cn(
					"text-blue-600 hover:text-blue-800 dark:text-blue-400 transition-colors p-1 hover:bg-blue-100 dark:hover:bg-slate-700 rounded",
					isLoading && "opacity-50 cursor-not-allowed"
				)}
				aria-label={t("bulk.closeAriaLabel")}
			>
				<X className="h-5 w-5" />
			</button>
		</section>
	);
};
