import { ArrowUpDown, MoveDown, MoveUp } from "lucide-react";

/**
 * Format a date string into a human-readable format
 * @param dateString - ISO 8601 date string
 * @returns Formatted date string (e.g., "03 Sep, 2025 18:07")
 */
export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Render a sort icon based on the sort state
 * @param currentColumn - The column being sorted
 * @param targetColumn - The column this icon is for
 * @param sortOrder - Current sort order ('asc' or 'desc')
 * @returns Icon component representing the sort state
 */
export function renderSortIcon(
	currentColumn: string,
	targetColumn: string,
	sortOrder: "asc" | "desc",
) {
	if (currentColumn !== targetColumn) {
		return <ArrowUpDown className="h-4 w-4" />;
	}
	return sortOrder === "asc" ? (
		<MoveUp className="h-4 w-4" />
	) : (
		<MoveDown className="h-4 w-4" />
	);
}

/**
 * Get the sort icon type for a column
 * @param currentColumn - The column currently being sorted
 * @param targetColumn - The column to check
 * @param sortOrder - Current sort order ('asc' or 'desc')
 * @returns Icon type ('default', 'asc', or 'desc')
 */
export function getSortIconType(
	currentColumn: string,
	targetColumn: string,
	sortOrder: "asc" | "desc",
): "default" | "asc" | "desc" {
	if (currentColumn !== targetColumn) {
		return "default";
	}
	return sortOrder;
}
