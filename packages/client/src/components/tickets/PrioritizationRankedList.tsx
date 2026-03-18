import { BookX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { formatRelativeTime } from "@/lib/date-utils";
import { renderSortIcon } from "@/lib/table-utils";
import type {
	RoiRankedCluster,
	RoiSortKey,
} from "@/lib/tickets/prioritization";
import type { ClusterListItem } from "@/types/cluster";

interface PrioritizationRankedListProps {
	/** Pre-computed ROI ranked clusters from parent */
	roiRanked: RoiRankedCluster[];
	/** Active preset sort key, controlled by parent (null = default volume) */
	activePreset: RoiSortKey | null;
	/** Callback when column sort overrides the preset */
	onPresetChange?: (key: RoiSortKey) => void;
}

type SortColumn = "tickets" | "open" | RoiSortKey;

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
	activePreset,
	onPresetChange,
}: PrioritizationRankedListProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();

	const [sortCol, setSortCol] = useState<SortColumn>(
		activePreset ?? "costImpact",
	);
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

	// Sync internal sort when parent preset changes
	useEffect(() => {
		if (activePreset) {
			setSortCol(activePreset);
			setSortDir("desc");
		}
	}, [activePreset]);

	const handleColumnSort = (col: SortColumn) => {
		if (sortCol === col) {
			setSortDir((d) => (d === "desc" ? "asc" : "desc"));
		} else {
			setSortCol(col);
			setSortDir("desc");
			if (col !== "tickets" && col !== "open" && onPresetChange) {
				onPresetChange(col);
			}
		}
	};

	const sorted = useMemo(() => {
		if (sortCol === "tickets") {
			const mul = sortDir === "desc" ? -1 : 1;
			return [...roiRanked].sort(
				(a, b) => mul * (a.cluster.ticket_count - b.cluster.ticket_count),
			);
		}
		if (sortCol === "open") {
			const mul = sortDir === "desc" ? -1 : 1;
			return [...roiRanked].sort(
				(a, b) =>
					mul *
					(a.cluster.needs_response_count - b.cluster.needs_response_count),
			);
		}
		return roiRanked;
	}, [roiRanked, sortCol, sortDir]);

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
								{renderSortIcon(sortCol, "tickets", sortDir)}
							</button>
						</TableHead>
						<TableHead>
							<button
								type="button"
								onClick={() => handleColumnSort("mttr")}
								className="inline-flex items-center gap-1 cursor-pointer"
							>
								{t("prioritizationList.columns.mttr")}
								{renderSortIcon(sortCol, "mttr", sortDir)}
							</button>
						</TableHead>
						<TableHead>
							<button
								type="button"
								onClick={() => handleColumnSort("costImpact")}
								className="inline-flex items-center gap-1 cursor-pointer"
							>
								{t("prioritizationList.columns.costImpact")}
								{renderSortIcon(sortCol, "costImpact", sortDir)}
							</button>
						</TableHead>
						<TableHead>
							<button
								type="button"
								onClick={() => handleColumnSort("timeTaken")}
								className="inline-flex items-center gap-1 cursor-pointer"
							>
								{t("prioritizationList.columns.timeTaken")}
								{renderSortIcon(sortCol, "timeTaken", sortDir)}
							</button>
						</TableHead>
						<TableHead>{t("prioritizationList.columns.kbStatus")}</TableHead>
						<TableHead>{t("prioritizationList.columns.updated")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.map((row, idx) => (
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
							<TableCell>
								{row.mttr != null ? formatMinutes(row.mttr) : "—"}
							</TableCell>
							<TableCell>{formatCurrency(row.costImpact)}</TableCell>
							<TableCell>{formatMinutes(row.timeTaken)}</TableCell>
							<TableCell>
								<GapIcon cluster={row.cluster} />
							</TableCell>
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
