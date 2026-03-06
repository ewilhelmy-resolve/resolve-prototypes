import type { ClusterListItem } from "@/types/cluster";

export type CTAState = "pending" | "gap" | "knowledgeFound";

export interface RankedCluster {
	cluster: ClusterListItem;
	rank: number;
	estimatedMonthlyCost: number;
	estimatedMonthlyHours: number;
	manualBurdenPercent: number;
	ctaState: CTAState;
	displayName: string;
}

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

export function rankClusters(
	clusters: ClusterListItem[],
	costPerTicket: number,
	avgTimePerTicket: number,
): RankedCluster[] {
	return clusters
		.map((cluster) => {
			const estimatedMonthlyCost = cluster.needs_response_count * costPerTicket;
			const estimatedMonthlyHours =
				(cluster.needs_response_count * avgTimePerTicket) / 60;
			const manualBurdenPercent =
				cluster.ticket_count > 0
					? (cluster.needs_response_count / cluster.ticket_count) * 100
					: 0;
			const displayName = cluster.subcluster_name
				? `${cluster.name} - ${cluster.subcluster_name}`
				: cluster.name;

			return {
				cluster,
				rank: 0,
				estimatedMonthlyCost,
				estimatedMonthlyHours,
				manualBurdenPercent,
				ctaState: deriveCTAState(cluster),
				displayName,
			};
		})
		.sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost)
		.map((item, index) => ({ ...item, rank: index + 1 }));
}

export type Quadrant = "fixNow" | "readyToAutomate" | "backlog" | "monitor";

export interface QuadrantData {
	quadrant: Quadrant;
	clusters: { cluster: ClusterListItem; displayName: string }[];
}

export function bucketIntoQuadrants(
	clusters: ClusterListItem[],
): Record<Quadrant, QuadrantData> {
	// Split volume at median
	const sorted = [...clusters].sort((a, b) => b.ticket_count - a.ticket_count);
	const medianIndex = Math.floor(sorted.length / 2);
	const volumeThreshold = sorted[medianIndex]?.ticket_count ?? 0;

	const result: Record<Quadrant, QuadrantData> = {
		fixNow: { quadrant: "fixNow", clusters: [] },
		readyToAutomate: { quadrant: "readyToAutomate", clusters: [] },
		backlog: { quadrant: "backlog", clusters: [] },
		monitor: { quadrant: "monitor", clusters: [] },
	};

	for (const cluster of clusters) {
		const displayName = cluster.subcluster_name
			? `${cluster.name} - ${cluster.subcluster_name}`
			: cluster.name;
		const entry = { cluster, displayName };

		const isHighVolume = cluster.ticket_count >= volumeThreshold;
		const hasKnowledge = cluster.kb_status === "FOUND";

		if (isHighVolume && !hasKnowledge) {
			result.fixNow.clusters.push(entry);
		} else if (isHighVolume && hasKnowledge) {
			result.readyToAutomate.clusters.push(entry);
		} else if (!isHighVolume && !hasKnowledge) {
			result.backlog.clusters.push(entry);
		} else {
			result.monitor.clusters.push(entry);
		}
	}

	// Sort each quadrant by ticket_count descending
	for (const q of Object.values(result)) {
		q.clusters.sort((a, b) => b.cluster.ticket_count - a.cluster.ticket_count);
	}

	return result;
}

/** Mock MTTR values per cluster (minutes) for demo mode */
export const MOCK_MTTR_MINUTES: Record<string, number> = {
	"cl-001": 18,
	"cl-002": 6,
	"cl-003": 42,
	"cl-004": 25,
	"cl-005": 55,
	"cl-006": 35,
	"cl-007": 12,
	"cl-008": 30,
};

export interface RoiRankedCluster {
	cluster: ClusterListItem;
	rank: number;
	displayName: string;
	costImpact: number;
	timeTaken: number;
	mttr: number;
	ctaState: CTAState;
}

export type RoiSortKey = "costImpact" | "mttr" | "timeTaken";

export function rankClustersByRoi(
	clusters: ClusterListItem[],
	costPerTicket: number,
	avgTimePerTicket: number,
	sortKey: RoiSortKey = "costImpact",
	sortDir: "asc" | "desc" = "desc",
): RoiRankedCluster[] {
	const items = clusters.map((cluster) => {
		const displayName = cluster.subcluster_name
			? `${cluster.name} - ${cluster.subcluster_name}`
			: cluster.name;
		const costImpact =
			costPerTicket * (avgTimePerTicket / 60) * cluster.ticket_count;
		const timeTaken = avgTimePerTicket * cluster.needs_response_count;
		const mttr = MOCK_MTTR_MINUTES[cluster.id] ?? 20;

		return {
			cluster,
			rank: 0,
			displayName,
			costImpact,
			timeTaken,
			mttr,
			ctaState: deriveCTAState(cluster),
		};
	});

	items.sort((a, b) => {
		const mul = sortDir === "desc" ? -1 : 1;
		return mul * (a[sortKey] - b[sortKey]);
	});

	return items.map((item, i) => ({ ...item, rank: i + 1 }));
}

export function computeAggregateSavings(
	clusters: ClusterListItem[],
	costPerTicket: number,
	avgTimePerTicket: number,
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
		totalMonthlyCost: totalNeedsResponse * costPerTicket,
		totalMonthlyHours: (totalNeedsResponse * avgTimePerTicket) / 60,
		knowledgeFoundCount,
		totalCount: clusters.length,
	};
}
