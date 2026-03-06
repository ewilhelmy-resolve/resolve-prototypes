import {
	BarChart3,
	CircleDot,
	List,
	ScatterChart as ScatterChartIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ClusterListItem } from "@/types/cluster";
import { BubbleStripView } from "./prioritization/BubbleStripView";
import { DivergingBarsView } from "./prioritization/DivergingBarsView";
import { RankedListView } from "./prioritization/RankedListView";
import { ScatterView } from "./prioritization/ScatterView";
import type { ChartPoint, ViewMode } from "./prioritization/types";

interface PrioritizationChartProps {
	clusters: ClusterListItem[];
	highlightId?: string;
}

const COLORS = {
	knowledge: "#3b82f6",
	noKnowledge: "#9ca3af",
} as const;

const VIEW_OPTIONS: {
	mode: ViewMode;
	icon: typeof ScatterChartIcon;
	labelKey: string;
}[] = [
	{
		mode: "scatter",
		icon: ScatterChartIcon,
		labelKey: "prioritization.views.scatter",
	},
	{
		mode: "bubbleStrip",
		icon: CircleDot,
		labelKey: "prioritization.views.bubbleStrip",
	},
	{
		mode: "divergingBars",
		icon: BarChart3,
		labelKey: "prioritization.views.divergingBars",
	},
	{
		mode: "rankedList",
		icon: List,
		labelKey: "prioritization.views.rankedList",
	},
];

export function PrioritizationChart({
	clusters,
	highlightId,
}: PrioritizationChartProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();
	const [view, setView] = useState<ViewMode>("scatter");

	const MAX_VISIBLE = 10;

	const allPoints: ChartPoint[] = useMemo(() => {
		const maxTicketCount = Math.max(...clusters.map((c) => c.ticket_count), 1);
		return clusters
			.map((c) => {
				const hasKnowledge = c.kb_status === "FOUND";
				return {
					id: c.id,
					name: c.subcluster_name ? `${c.name} - ${c.subcluster_name}` : c.name,
					hasKnowledge,
					ticketCount: c.ticket_count,
					y: (c.ticket_count / maxTicketCount) * 100,
					fill: hasKnowledge ? COLORS.knowledge : COLORS.noKnowledge,
				};
			})
			.sort((a, b) => b.ticketCount - a.ticketCount);
	}, [clusters]);

	if (clusters.length === 0) return null;

	const visiblePoints = allPoints.slice(0, MAX_VISIBLE);
	const hiddenCount = Math.max(0, allPoints.length - MAX_VISIBLE);

	const handleClick = (point: ChartPoint) => {
		navigate(`/tickets/${point.id}`);
	};

	const ViewComponent = {
		scatter: ScatterView,
		bubbleStrip: BubbleStripView,
		divergingBars: DivergingBarsView,
		rankedList: RankedListView,
	}[view];

	return (
		<div className="rounded-lg border bg-background p-3">
			<div className="mb-4 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h2 className="font-semibold">{t("prioritization.title")}</h2>
					<p className="text-sm text-muted-foreground">
						{t("prioritization.description")}
					</p>
				</div>
				<div
					role="radiogroup"
					aria-label={t("prioritization.viewSwitcherLabel")}
					className="flex shrink-0 gap-0.5"
				>
					{VIEW_OPTIONS.map(({ mode, icon: Icon, labelKey }) => (
						<Tooltip key={mode}>
							<TooltipTrigger asChild>
								<Button
									variant={view === mode ? "secondary" : "ghost"}
									size="icon"
									role="radio"
									aria-checked={view === mode}
									aria-label={t(labelKey)}
									onClick={() => setView(mode)}
									className="size-8"
								>
									<Icon className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t(labelKey)}</TooltipContent>
						</Tooltip>
					))}
				</div>
			</div>
			<ViewComponent
				points={visiblePoints}
				highlightId={highlightId}
				onPointClick={handleClick}
			/>
			{hiddenCount > 0 && (
				<p className="mt-2 text-center text-xs text-muted-foreground">
					{t("prioritization.hiddenCount", { count: hiddenCount })}
				</p>
			)}
		</div>
	);
}
