import { ArrowUpDown, MoveDown, MoveUp } from "lucide-react";

export { formatDate } from "@/lib/date-utils";

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
