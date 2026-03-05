import { BookX, ZapOff } from "lucide-react";
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
	/** Map of cluster ID → has linked action */
	actionsMap?: Record<string, boolean>;
}

type SortColumn = "tickets" | "open" | RoiSortKey;

export function PrioritizationRankedList({
	clusters,
	activePreset,
	onPresetChange,
	actionsMap,
}: PrioritizationRankedListProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();
	const { costPerTicket, avgTimePerTicket } = useTicketSettingsStore();

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
				costPerTicket,
				avgTimePerTicket,
				roiSortKey,
				sortDir,
			),
		[clusters, costPerTicket, avgTimePerTicket, roiSortKey, sortDir],
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

	const gapIcons = (cluster: ClusterListItem) => {
		const hasKnowledgeGap = cluster.kb_status === "GAP";
		const hasAutomationGap = actionsMap?.[cluster.id] === false;
		if (!hasKnowledgeGap && !hasAutomationGap) return null;
		return (
			<div className="flex items-center gap-1.5">
				{hasKnowledgeGap && (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
								<BookX className="h-3.5 w-3.5 text-yellow-600" />
							</span>
						</TooltipTrigger>
						<TooltipContent>Knowledge Gap</TooltipContent>
					</Tooltip>
				)}
				{hasAutomationGap && (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
								<ZapOff className="h-3.5 w-3.5 text-blue-500" />
							</span>
						</TooltipTrigger>
						<TooltipContent>Automation Gap</TooltipContent>
					</Tooltip>
				)}
			</div>
		);
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
						<TableHead>
							{t("prioritizationList.columns.kbStatus")}
						</TableHead>
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
							<TableCell>{formatMinutes(row.mttr)}</TableCell>
							<TableCell>{formatCurrency(row.costImpact)}</TableCell>
							<TableCell>{formatMinutes(row.timeTaken)}</TableCell>
							<TableCell>{gapIcons(row.cluster)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
