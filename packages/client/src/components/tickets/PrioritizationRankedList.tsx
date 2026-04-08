import { formatRelativeTime } from "./TicketGroupStat";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePhaseGate } from "@/hooks/usePhaseGate";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type RoiSortKey,
	rankClustersByRoi,
} from "@/lib/tickets/prioritization";
import { renderSortIcon } from "@/lib/table-utils";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";
import type { ClusterListItem } from "@/types/cluster";

interface PrioritizationRankedListProps {
	clusters: ClusterListItem[];
	/** Active preset sort key, controlled by parent (null = default volume) */
	activePreset: RoiSortKey | null;
	/** Callback when column sort overrides the preset */
	onPresetChange?: (key: RoiSortKey) => void;
}

type SortColumn = "tickets" | "open" | RoiSortKey;

export function PrioritizationRankedList({
	clusters,
	activePreset,
	onPresetChange,
}: PrioritizationRankedListProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();
	const phaseV3 = usePhaseGate("tickets", "v3");
	const { blendedRatePerHour, timeToTake } = useTicketSettingsStore();

	const [sortCol, setSortCol] = useState<SortColumn>(activePreset ?? "costImpact");
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
			// Sync parent preset if column is a preset key
			if (col !== "tickets" && col !== "open" && onPresetChange) {
				onPresetChange(col);
			}
		}
	};

	const roiSortKey: RoiSortKey =
		sortCol === "tickets" || sortCol === "open" ? "costImpact" : sortCol;

	const ranked = useMemo(
		() =>
			rankClustersByRoi(
				clusters,
				blendedRatePerHour,
				timeToTake,
				roiSortKey,
				sortDir,
			),
		[clusters, blendedRatePerHour, timeToTake, roiSortKey, sortDir],
	);

	const sorted = useMemo(() => {
		if (sortCol === "tickets") {
			const mul = sortDir === "desc" ? -1 : 1;
			return [...ranked].sort(
				(a, b) => mul * (a.cluster.ticket_count - b.cluster.ticket_count),
			);
		}
		if (sortCol === "open") {
			const mul = sortDir === "desc" ? -1 : 1;
			return [...ranked].sort(
				(a, b) =>
					mul *
					(a.cluster.needs_response_count - b.cluster.needs_response_count),
			);
		}
		return ranked;
	}, [ranked, sortCol, sortDir]);

	const formatCurrency = (val: number) =>
		`$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

	const formatMinutes = (val: number) => {
		if (val >= 60) {
			const h = Math.floor(val / 60);
			const m = Math.round(val % 60);
			return m > 0 ? `${h}h ${m}m` : `${h}h`;
		}
		return `${Math.round(val)}m`;
	};

	return (
		<div className="flex flex-col gap-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10">#</TableHead>
						<TableHead>
							{t("prioritizationList.columns.cluster")}
						</TableHead>
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
						{phaseV3 && (
							<TableHead>
								{t("prioritizationList.columns.mttr")}
							</TableHead>
						)}
						<TableHead>Updated</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.map((row, idx) => (
						<TableRow
							key={row.cluster.id}
							onClick={() => navigate(`/tickets/${row.cluster.id}`)}
							className="cursor-pointer"
						>
							<TableCell className="text-muted-foreground">
								{idx + 1}
							</TableCell>
							<TableCell className="font-medium max-w-[260px] truncate">
								{row.displayName}
							</TableCell>
							<TableCell>
								{row.cluster.ticket_count.toLocaleString()}
							</TableCell>
							<TableCell>{formatCurrency(row.costImpact)}</TableCell>
							<TableCell>{formatMinutes(row.timeTaken)}</TableCell>
							{phaseV3 && <TableCell>3.2hr</TableCell>}
							<TableCell className="text-muted-foreground text-xs">
								{(() => {
									const newCount = Math.floor(row.cluster.needs_response_count * 0.3);
									const time = formatRelativeTime(row.cluster.updated_at);
									return newCount > 0
										? `${newCount} new \u00b7 ${time}`
										: time;
								})()}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
