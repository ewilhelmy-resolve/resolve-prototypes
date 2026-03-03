import { BookX, ZapOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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
}

type SortColumn = "tickets" | "open" | RoiSortKey;

const PRESETS: { key: RoiSortKey; i18nKey: string }[] = [
	{ key: "costImpact", i18nKey: "prioritizationList.presets.highestCost" },
	{ key: "mttr", i18nKey: "prioritizationList.presets.longestMttr" },
	{ key: "timeTaken", i18nKey: "prioritizationList.presets.mostTime" },
];

export function PrioritizationRankedList({
	clusters,
}: PrioritizationRankedListProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();
	const { costPerTicket, avgTimePerTicket } = useTicketSettingsStore();

	const [activePreset, setActivePreset] = useState<RoiSortKey>("costImpact");
	const [sortCol, setSortCol] = useState<SortColumn>("costImpact");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

	const handlePreset = (key: RoiSortKey) => {
		setActivePreset(key);
		setSortCol(key);
		setSortDir("desc");
	};

	const handleColumnSort = (col: SortColumn) => {
		setActivePreset(null as unknown as RoiSortKey);
		if (sortCol === col) {
			setSortDir((d) => (d === "desc" ? "asc" : "desc"));
		} else {
			setSortCol(col);
			setSortDir("desc");
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

	const kbIcon = (status: string) => {
		if (status === "GAP")
			return <BookX className="size-4 text-orange-500" aria-label="Knowledge gap" />;
		if (status === "FOUND") return null;
		return null;
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Preset pills */}
			<div className="flex gap-2">
				{PRESETS.map(({ key, i18nKey }) => (
					<button
						key={key}
						type="button"
						onClick={() => handlePreset(key)}
						className="focus:outline-none"
					>
						<Badge
							variant={activePreset === key ? "default" : "outline"}
							className="cursor-pointer"
						>
							{t(i18nKey)}
						</Badge>
					</button>
				))}
			</div>

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
								onClick={() => handleColumnSort("open")}
								className="inline-flex items-center gap-1 cursor-pointer"
							>
								{t("prioritizationList.columns.open")}
								{renderSortIcon(sortCol, "open", sortDir)}
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
							<TableCell>
								{row.cluster.needs_response_count.toLocaleString()}
							</TableCell>
							<TableCell>{formatMinutes(row.mttr)}</TableCell>
							<TableCell>{formatCurrency(row.costImpact)}</TableCell>
							<TableCell>{formatMinutes(row.timeTaken)}</TableCell>
							<TableCell>{kbIcon(row.cluster.kb_status)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
