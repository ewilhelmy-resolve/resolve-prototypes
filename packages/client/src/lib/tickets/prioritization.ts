import { getClusterDisplayTitle } from "@/lib/cluster-utils";
import {
	calculateEstMoneySaved,
	calculateEstTimeSavedMinutes,
} from "@/lib/format-utils";
import type { ClusterListItem } from "@/types/cluster";

export type CTAState = "pending" | "gap" | "knowledgeFound";

export interface AggregateSavings {
	totalNeedsResponse: number;
	totalMonthlyCost: number;
	totalMonthlyHours: number;
	knowledgeFoundCount: number;
	totalCount: number;
}

export function deriveCTAState(cluster: ClusterListItem): CTAState {
	if (cluster.kb_status === "PENDING") return "pending";
	if (cluster.kb_status === "GAP") return "gap";
	if (cluster.kb_status === "FOUND") return "knowledgeFound";
	return "pending";
}

export interface RoiRankedCluster {
	cluster: ClusterListItem;
	rank: number;
	displayName: string;
	costImpact: number;
	timeTaken: number;
	mttr: number | undefined;
	ctaState: CTAState;
}

export type RoiSortKey = "costImpact" | "mttr" | "timeTaken";

export function rankClustersByRoi(
	clusters: ClusterListItem[],
	blendedRatePerHour: number,
	avgMinutesPerTicket: number,
	sortKey: RoiSortKey = "costImpact",
	sortDir: "asc" | "desc" = "desc",
): RoiRankedCluster[] {
	const items: RoiRankedCluster[] = clusters.map((cluster) => ({
		cluster,
		rank: 0,
		displayName: getClusterDisplayTitle(cluster.name, cluster.subcluster_name),
		costImpact: calculateEstMoneySaved(
			blendedRatePerHour,
			avgMinutesPerTicket,
			cluster.ticket_count,
		),
		timeTaken: calculateEstTimeSavedMinutes(
			avgMinutesPerTicket,
			cluster.needs_response_count,
		),
		mttr: undefined,
		ctaState: deriveCTAState(cluster),
	}));

	items.sort((a, b) => {
		const mul = sortDir === "desc" ? -1 : 1;
		const aVal = a[sortKey] ?? 0;
		const bVal = b[sortKey] ?? 0;
		return mul * (aVal - bVal);
	});

	return items.map((item, i) => ({ ...item, rank: i + 1 }));
}

export function computeAggregateSavings(
	clusters: ClusterListItem[],
	blendedRatePerHour: number,
	avgMinutesPerTicket: number,
): AggregateSavings {
	let totalNeedsResponse = 0;
	let knowledgeFoundCount = 0;

	for (const c of clusters) {
		totalNeedsResponse += c.needs_response_count;
		if (c.kb_status === "FOUND") {
			knowledgeFoundCount++;
		}
	}

	return {
		totalNeedsResponse,
		totalMonthlyCost: totalNeedsResponse * blendedRatePerHour,
		totalMonthlyHours: (totalNeedsResponse * avgMinutesPerTicket) / 60,
		knowledgeFoundCount,
		totalCount: clusters.length,
	};
}
