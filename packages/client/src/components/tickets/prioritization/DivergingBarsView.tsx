import { useTranslation } from "react-i18next";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PrioritizationViewProps } from "./types";

export function DivergingBarsView({
	points,
	highlightId,
	onPointClick,
}: PrioritizationViewProps) {
	const { t } = useTranslation("tickets");

	const sorted = [...points].sort((a, b) => b.y - a.y);
	const maxY = Math.max(...points.map((p) => p.y), 1);

	return (
		<div style={{ height: 300 }} className="flex flex-col overflow-y-auto">
			{/* Column headers */}
			<div className="mb-2 flex text-xs font-medium text-muted-foreground">
				<span className="flex-1 text-right pr-3">
					{t("prioritization.axes.noKnowledge")}
				</span>
				<span className="w-px" />
				<span className="flex-1 pl-3">
					{t("prioritization.axes.knowledgeExists")}
				</span>
			</div>

			<div className="flex flex-1 flex-col gap-1.5">
				{sorted.map((p) => {
					const barWidth = Math.max(8, (p.y / maxY) * 100);
					const isHighlighted = highlightId === p.id;
					const isDimmed = highlightId && !isHighlighted;

					return (
						<Tooltip key={p.id}>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => onPointClick(p)}
									className={cn(
										"flex h-7 cursor-pointer items-center transition-opacity",
										isDimmed && "opacity-20",
									)}
									aria-label={`${p.name}, ${p.ticketCount} tickets`}
								>
									{/* Left side (no knowledge) */}
									<div className="flex flex-1 justify-end pr-1">
										{!p.hasKnowledge && (
											<div
												className={cn(
													"h-5 rounded-l-sm",
													isHighlighted && "ring-2 ring-slate-800",
												)}
												style={{
													width: `${barWidth}%`,
													backgroundColor: p.fill,
												}}
											/>
										)}
									</div>

									{/* Center axis */}
									<div className="w-px shrink-0 bg-border" />

									{/* Right side (knowledge exists) */}
									<div className="flex flex-1 pl-1">
										{p.hasKnowledge && (
											<div
												className={cn(
													"h-5 rounded-r-sm",
													isHighlighted && "ring-2 ring-slate-800",
												)}
												style={{
													width: `${barWidth}%`,
													backgroundColor: p.fill,
												}}
											/>
										)}
									</div>
								</button>
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
