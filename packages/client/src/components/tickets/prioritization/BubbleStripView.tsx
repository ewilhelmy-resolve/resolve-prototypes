import { useTranslation } from "react-i18next";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChartPoint, PrioritizationViewProps } from "./types";

export function BubbleStripView({
	points,
	highlightId,
	onPointClick,
}: PrioritizationViewProps) {
	const { t } = useTranslation("tickets");

	const noKnowledge = points.filter((p) => !p.hasKnowledge);
	const hasKnowledge = points.filter((p) => p.hasKnowledge);
	const maxTickets = Math.max(...points.map((p) => p.ticketCount), 1);

	return (
		<div className="flex gap-4 px-2" style={{ height: 300 }}>
			<Lane
				label={t("prioritization.axes.noKnowledge")}
				items={noKnowledge}
				maxTickets={maxTickets}
				highlightId={highlightId}
				onPointClick={onPointClick}
			/>
			<div className="w-px bg-border" />
			<Lane
				label={t("prioritization.axes.knowledgeExists")}
				items={hasKnowledge}
				maxTickets={maxTickets}
				highlightId={highlightId}
				onPointClick={onPointClick}
			/>
		</div>
	);
}

function Lane({
	label,
	items,
	maxTickets,
	highlightId,
	onPointClick,
}: {
	label: string;
	items: ChartPoint[];
	maxTickets: number;
	highlightId?: string;
	onPointClick: (p: ChartPoint) => void;
}) {
	const sorted = [...items].sort((a, b) => b.ticketCount - a.ticketCount);

	return (
		<div className="flex flex-1 flex-col">
			<span className="mb-2 text-center text-xs font-medium text-muted-foreground">
				{label}
			</span>
			<div className="relative flex-1">
				{sorted.map((p) => {
					const size = Math.max(24, (p.ticketCount / maxTickets) * 56);
					const top = 100 - p.y;

					return (
						<Tooltip key={p.id}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => onPointClick(p)}
									className={cn(
										"absolute left-1/2 -translate-x-1/2 rounded-full transition-opacity cursor-pointer",
										highlightId && p.id !== highlightId && "opacity-20",
									)}
									style={{
										top: `${top}%`,
										width: size,
										height: size,
										backgroundColor: p.fill,
										opacity:
											highlightId && p.id === highlightId ? 1 : undefined,
										border:
											highlightId && p.id === highlightId
												? "2px solid #1e293b"
												: "none",
									}}
									aria-label={`${p.name}, ${p.ticketCount} tickets`}
								/>
							</TooltipTrigger>
							<TooltipContent>
								<p className="font-medium">{p.name}</p>
								<p>{p.ticketCount} tickets</p>
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		</div>
	);
}
