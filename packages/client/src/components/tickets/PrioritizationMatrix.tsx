import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
	bucketIntoQuadrants,
	type Quadrant,
	type QuadrantData,
} from "@/lib/tickets/prioritization";
import { cn } from "@/lib/utils";
import type { ClusterListItem } from "@/types/cluster";

interface PrioritizationMatrixProps {
	clusters: ClusterListItem[];
}

const QUADRANT_CONFIG: Record<
	Quadrant,
	{ bg: string; border: string; dot: string }
> = {
	fixNow: {
		bg: "bg-red-50",
		border: "border-red-200",
		dot: "bg-red-500",
	},
	readyToAutomate: {
		bg: "bg-green-50",
		border: "border-green-200",
		dot: "bg-green-500",
	},
	backlog: {
		bg: "bg-orange-50",
		border: "border-orange-200",
		dot: "bg-orange-500",
	},
	monitor: {
		bg: "bg-blue-50",
		border: "border-blue-200",
		dot: "bg-blue-500",
	},
};

function QuadrantCell({ data }: { data: QuadrantData }) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();
	const config = QUADRANT_CONFIG[data.quadrant];

	return (
		<div
			className={cn(
				"flex flex-col gap-2 rounded-lg border p-4",
				config.bg,
				config.border,
			)}
		>
			<div className="flex items-center gap-2">
				<span className={cn("size-2 rounded-full", config.dot)} />
				<h3 className="text-sm font-semibold">
					{t(`prioritization.${data.quadrant}.title`)}
				</h3>
			</div>
			<p className="text-xs text-muted-foreground">
				{t(`prioritization.${data.quadrant}.description`)}
			</p>
			{data.clusters.length > 0 ? (
				<ul className="mt-1 flex flex-col gap-1">
					{data.clusters.map(({ cluster, displayName }) => (
						<li key={cluster.id}>
							<button
								type="button"
								onClick={() => navigate(`/tickets/${cluster.id}`)}
								className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white/60 transition-colors cursor-pointer"
							>
								<span className="min-w-0 truncate font-medium">
									{displayName}
								</span>
								<span className="shrink-0 text-xs text-muted-foreground">
									{cluster.ticket_count.toLocaleString()}
								</span>
							</button>
						</li>
					))}
				</ul>
			) : (
				<p className="mt-1 text-xs italic text-muted-foreground">
					{t("prioritization.empty")}
				</p>
			)}
		</div>
	);
}

export function PrioritizationMatrix({ clusters }: PrioritizationMatrixProps) {
	const { t } = useTranslation("tickets");

	const quadrants = useMemo(() => bucketIntoQuadrants(clusters), [clusters]);

	return (
		<div className="flex flex-col gap-3">
			{/* Axis labels */}
			<div className="grid grid-cols-[auto_1fr_1fr] grid-rows-[auto_1fr_1fr] gap-3">
				{/* Corner spacer */}
				<div />
				{/* Top column headers */}
				<div className="text-center text-xs font-medium text-muted-foreground pb-1">
					{t("prioritization.axis.noKnowledge")}
				</div>
				<div className="text-center text-xs font-medium text-muted-foreground pb-1">
					{t("prioritization.axis.knowledgeExists")}
				</div>

				{/* High volume row */}
				<div className="flex items-center pr-2">
					<span className="text-xs font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180">
						{t("prioritization.axis.highVolume")}
					</span>
				</div>
				<QuadrantCell data={quadrants.fixNow} />
				<QuadrantCell data={quadrants.readyToAutomate} />

				{/* Low volume row */}
				<div className="flex items-center pr-2">
					<span className="text-xs font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180">
						{t("prioritization.axis.lowVolume")}
					</span>
				</div>
				<QuadrantCell data={quadrants.backlog} />
				<QuadrantCell data={quadrants.monitor} />
			</div>
		</div>
	);
}
