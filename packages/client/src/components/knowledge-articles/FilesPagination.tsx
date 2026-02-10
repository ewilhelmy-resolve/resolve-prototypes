import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface FilesPaginationProps {
	/** Current page index (0-based) */
	page: number;
	/** Number of items per page */
	pageSize: number;
	/** Total number of items */
	total: number;
	/** Whether any filters are active */
	hasFilters?: boolean;
	/** Number of items matching current filters (when hasFilters is true) */
	filteredCount?: number;
	/** Callback for previous page */
	onPrevious: () => void;
	/** Callback for next page */
	onNext: () => void;
}

export function FilesPagination({
	page,
	pageSize,
	total,
	hasFilters = false,
	filteredCount,
	onPrevious,
	onNext,
}: FilesPaginationProps) {
	const { t } = useTranslation("kbs");

	const hasNextPage = (page + 1) * pageSize < total;
	const hasPrevPage = page > 0;

	return (
		<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
			<p className="text-sm text-muted-foreground">
				{hasFilters
					? t("pagination.showingFiltered", {
							count: filteredCount ?? 0,
							total,
						})
					: t("pagination.showing", {
							start: page * pageSize + 1,
							end: Math.min((page + 1) * pageSize, total),
							total,
						})}
			</p>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onPrevious}
					disabled={!hasPrevPage}
				>
					{t("pagination.previous")}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onNext}
					disabled={!hasNextPage}
				>
					{t("pagination.next")}
				</Button>
			</div>
		</div>
	);
}
