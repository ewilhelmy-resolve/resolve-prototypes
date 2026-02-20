import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ChartPoint, PrioritizationViewProps } from "./types";

export function RankedListView({
	points,
	highlightId,
	onPointClick,
}: PrioritizationViewProps) {
	const { t } = useTranslation("tickets");

	const noKnowledge = [...points]
		.filter((p) => !p.hasKnowledge)
		.sort((a, b) => b.y - a.y);
	const hasKnowledge = [...points]
		.filter((p) => p.hasKnowledge)
		.sort((a, b) => b.y - a.y);

	return (
		<div className="grid grid-cols-2 gap-4" style={{ height: 300 }}>
			<Column
				label={t("prioritization.axes.noKnowledge")}
				items={noKnowledge}
				highlightId={highlightId}
				onPointClick={onPointClick}
			/>
			<Column
				label={t("prioritization.axes.knowledgeExists")}
				items={hasKnowledge}
				highlightId={highlightId}
				onPointClick={onPointClick}
			/>
		</div>
	);
}

function Column({
	label,
	items,
	highlightId,
	onPointClick,
}: {
	label: string;
	items: ChartPoint[];
	highlightId?: string;
	onPointClick: (p: ChartPoint) => void;
}) {
	return (
		<div className="flex flex-col overflow-y-auto">
			<span className="mb-2 text-xs font-medium text-muted-foreground">
				{label}
			</span>
			<div className="flex flex-col gap-1.5">
				{items.map((p) => {
					const isHighlighted = highlightId === p.id;
					const isDimmed = highlightId && !isHighlighted;

					return (
						<button
							key={p.id}
							type="button"
							onClick={() => onPointClick(p)}
							className={cn(
								"flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-opacity cursor-pointer hover:bg-accent",
								isHighlighted && "ring-2 ring-slate-800",
								isDimmed && "opacity-20",
							)}
							aria-label={`${p.name}, ${p.ticketCount} tickets`}
						>
							<span
								className="size-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: p.fill }}
							/>
							<span className="min-w-0 flex-1 truncate">{p.name}</span>
							<span className="shrink-0 text-xs text-muted-foreground">
								{p.ticketCount}
							</span>
						</button>
					);
				})}
				{items.length === 0 && (
					<p className="py-4 text-center text-xs text-muted-foreground">--</p>
				)}
			</div>
		</div>
	);
}
