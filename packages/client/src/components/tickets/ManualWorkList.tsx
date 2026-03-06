import { useMemo } from "react";
import {
	computeAggregateSavings,
	rankClusters,
} from "@/lib/tickets/prioritization";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";
import type { ClusterListItem } from "@/types/cluster";
import { ManualWorkRow } from "./ManualWorkRow";
import { ManualWorkSummary } from "./ManualWorkSummary";

interface ManualWorkListProps {
	clusters: ClusterListItem[];
}

export function ManualWorkList({ clusters }: ManualWorkListProps) {
	const costPerTicket = useTicketSettingsStore((s) => s.costPerTicket);
	const avgTimePerTicket = useTicketSettingsStore((s) => s.avgTimePerTicket);

	const ranked = useMemo(
		() => rankClusters(clusters, costPerTicket, avgTimePerTicket),
		[clusters, costPerTicket, avgTimePerTicket],
	);

	const savings = useMemo(
		() => computeAggregateSavings(clusters, costPerTicket, avgTimePerTicket),
		[clusters, costPerTicket, avgTimePerTicket],
	);

	return (
		<div className="flex flex-col gap-3">
			<ManualWorkSummary savings={savings} />
			<ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{ranked.map((item) => (
					<li key={item.cluster.id}>
						<ManualWorkRow item={item} />
					</li>
				))}
			</ul>
		</div>
	);
}
