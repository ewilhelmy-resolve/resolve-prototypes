import { BookX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { formatRelativeTime } from "@/lib/date-utils";
import { renderSortIcon } from "@/lib/table-utils";
import type { RoiRankedCluster } from "@/lib/tickets/prioritization";
import type { ClusterListItem } from "@/types/cluster";
import type { SortOption } from "./TicketGroups";

/** Column keys that map to a parent SortOption for server-side sorting */
type SortableColumn = "tickets" | "costImpact" | "timeTaken";

const COLUMN_TO_SORT: Record<SortableColumn, SortOption> = {
	tickets: "volume",
	costImpact: "volume",
	timeTaken: "timeTaken",
};

interface PrioritizationRankedListProps {
	roiRanked: RoiRankedCluster[];
	activeSort: SortOption;
	sortDir: "asc" | "desc";
	onSortChange: (sort: SortOption, dir: "asc" | "desc") => void;
}

function formatCurrency(val: number) {
	return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatMinutes(val: number) {
	if (val >= 60) {
		const h = Math.floor(val / 60);
		const m = Math.round(val % 60);
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}
	return `${Math.round(val)}m`;
}

function GapIcon({ cluster }: { cluster: ClusterListItem }) {
	const { t } = useTranslation("tickets");
	if (cluster.kb_status !== "GAP") return null;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
					<BookX className="h-3.5 w-3.5 text-yellow-600" />
				</span>
			</TooltipTrigger>
			<TooltipContent>{t("gaps.knowledgeGap")}</TooltipContent>
		</Tooltip>
	);
}

export function PrioritizationRankedList({
	roiRanked,
	activeSort,
	sortDir,
	onSortChange,
}: PrioritizationRankedListProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();
	const enableAdvancedFeatures = useFeatureFlag(
		"ENABLE_CLUSTER_ADVANCED_FEATURES",
	);

	const handleColumnSort = (col: SortableColumn) => {
		const targetSort = COLUMN_TO_SORT[col];
		if (activeSort === targetSort) {
			onSortChange(targetSort, sortDir === "desc" ? "asc" : "desc");
		} else {
			onSortChange(targetSort, "desc");
		}
	};

	// Determine which column is visually "active" based on activeSort
	const activeSortColumn: string =
		activeSort === "volume"
			? "tickets"
			: activeSort === "timeTaken"
				? "timeTaken"
				: "";

	return (
		<div className="flex flex-col gap-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10">#</TableHead>
						<TableHead>{t("prioritizationList.columns.cluster")}</TableHead>
						<TableHead>
							<button
								type="button"
								onClick={() => handleColumnSort("tickets")}
								className="inline-flex items-center gap-1 cursor-pointer"
							>
								{t("prioritizationList.columns.tickets")}
								{renderSortIcon(activeSortColumn, "tickets", sortDir)}
							</button>
						</TableHead>
						{enableAdvancedFeatures && (
							<TableHead>{t("prioritizationList.columns.mttr")}</TableHead>
						)}
						<TableHead>
							<button
								type="button"
								onClick={() => handleColumnSort("costImpact")}
								className="inline-flex items-center gap-1 cursor-pointer"
							>
								{t("prioritizationList.columns.costImpact")}
								{renderSortIcon(activeSortColumn, "tickets", sortDir)}
							</button>
						</TableHead>
						<TableHead>
							<button
								type="button"
								onClick={() => handleColumnSort("timeTaken")}
								className="inline-flex items-center gap-1 cursor-pointer"
							>
								{t("prioritizationList.columns.timeTaken")}
								{renderSortIcon(activeSortColumn, "timeTaken", sortDir)}
							</button>
						</TableHead>
						{enableAdvancedFeatures && (
							<TableHead>{t("prioritizationList.columns.kbStatus")}</TableHead>
						)}
						<TableHead>{t("prioritizationList.columns.updated")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{roiRanked.map((row, idx) => (
						<TableRow
							key={row.cluster.id}
							onClick={() => navigate(`/tickets/${row.cluster.id}`)}
							className="cursor-pointer"
						>
							<TableCell className="text-muted-foreground">{idx + 1}</TableCell>
							<TableCell className="font-medium max-w-[260px] truncate">
								{row.displayName}
							</TableCell>
							<TableCell>{row.cluster.ticket_count.toLocaleString()}</TableCell>
							{enableAdvancedFeatures && (
								<TableCell>
									{row.mttr != null ? formatMinutes(row.mttr) : "—"}
								</TableCell>
							)}
							<TableCell>{formatCurrency(row.costImpact)}</TableCell>
							<TableCell>{formatMinutes(row.timeTaken)}</TableCell>
							{enableAdvancedFeatures && (
								<TableCell>
									<GapIcon cluster={row.cluster} />
								</TableCell>
							)}
							<TableCell className="text-muted-foreground text-xs">
								{formatRelativeTime(row.cluster.updated_at)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
