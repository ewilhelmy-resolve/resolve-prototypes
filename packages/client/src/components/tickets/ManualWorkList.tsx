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
	const blendedRatePerHour = useTicketSettingsStore(
		(s) => s.blendedRatePerHour,
	);
	const avgMinutesPerTicket = useTicketSettingsStore(
		(s) => s.avgMinutesPerTicket,
	);

	const ranked = useMemo(
		() => rankClusters(clusters, blendedRatePerHour, avgMinutesPerTicket),
		[clusters, blendedRatePerHour, avgMinutesPerTicket],
	);

	const savings = useMemo(
		() =>
			computeAggregateSavings(
				clusters,
				blendedRatePerHour,
				avgMinutesPerTicket,
			),
		[clusters, blendedRatePerHour, avgMinutesPerTicket],
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
