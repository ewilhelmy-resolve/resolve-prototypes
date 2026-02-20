import { useTranslation } from "react-i18next";
import {
	CartesianGrid,
	Cell,
	Label,
	ReferenceLine,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
	ZAxis,
} from "recharts";
import type { ChartPoint, PrioritizationViewProps } from "./types";

interface ScatterPoint extends ChartPoint {
	x: number;
	z: number;
}

/** Seeded jitter so dots don't overlap but stay stable across renders */
function jitter(seed: string, range: number): number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
		hash |= 0;
	}
	return ((hash % (range * 2)) - range) / 1;
}

function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: Array<{ payload: ScatterPoint }>;
}) {
	if (!active || !payload?.length) return null;
	const point = payload[0].payload;
	return (
		<div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
			<p className="font-medium">{point.name}</p>
			<p className="text-muted-foreground">{point.ticketCount} tickets</p>
		</div>
	);
}

export function ScatterView({
	points,
	highlightId,
	onPointClick,
}: PrioritizationViewProps) {
	const { t } = useTranslation("tickets");

	const scatterPoints: ScatterPoint[] = points.map((p) => ({
		...p,
		x: (p.hasKnowledge ? 75 : 25) + jitter(p.id, 10),
		z: p.ticketCount,
	}));

	return (
		<div className="relative">
			<ResponsiveContainer width="100%" height={300}>
				<ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
					<XAxis
						type="number"
						dataKey="x"
						domain={[0, 100]}
						stroke="#6b7280"
						tick={false}
						tickLine={false}
					>
						<Label
							value={t("prioritization.axes.noKnowledge")}
							position="insideBottomLeft"
							offset={0}
							style={{ fontSize: 11, fill: "#6b7280" }}
						/>
						<Label
							value={t("prioritization.axes.knowledgeExists")}
							position="insideBottomRight"
							offset={0}
							style={{ fontSize: 11, fill: "#6b7280" }}
						/>
					</XAxis>
					<YAxis
						type="number"
						dataKey="y"
						domain={[0, 100]}
						stroke="#6b7280"
						tick={false}
						tickLine={false}
					>
						<Label
							value={t("prioritization.axes.volume")}
							angle={-90}
							position="insideLeft"
							offset={10}
							style={{ fontSize: 11, fill: "#6b7280" }}
						/>
					</YAxis>
					<ZAxis type="number" dataKey="z" range={[40, 400]} />
					<ReferenceLine x={50} stroke="#d1d5db" strokeDasharray="4 4" />
					<ReferenceLine y={50} stroke="#d1d5db" strokeDasharray="4 4" />
					<Tooltip content={<CustomTooltip />} />
					<Scatter data={scatterPoints} onClick={onPointClick} cursor="pointer">
						{scatterPoints.map((p) => (
							<Cell
								key={p.id}
								fill={p.fill}
								fillOpacity={
									highlightId ? (p.id === highlightId ? 1 : 0.2) : 0.8
								}
								stroke={
									highlightId && p.id === highlightId ? "#1e293b" : "none"
								}
								strokeWidth={highlightId && p.id === highlightId ? 2 : 0}
							/>
						))}
					</Scatter>
				</ScatterChart>
			</ResponsiveContainer>
			{/* Quadrant labels */}
			<div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2 px-[20px] py-[20px]">
				<span className="flex items-start justify-start pl-2 pt-1 text-[10px] font-medium text-muted-foreground/70">
					{t("prioritization.quadrants.createKnowledge")}
				</span>
				<span className="flex items-start justify-end pr-2 pt-1 text-[10px] font-medium text-muted-foreground/70">
					{t("prioritization.quadrants.automateFirst")}
				</span>
				<span className="flex items-end justify-start pb-6 pl-2 text-[10px] font-medium text-muted-foreground/70">
					{t("prioritization.quadrants.lowerPriority")}
				</span>
				<span className="flex items-end justify-end pb-6 pr-2 text-[10px] font-medium text-muted-foreground/70">
					{t("prioritization.quadrants.ignoreForNow")}
				</span>
			</div>
		</div>
	);
}
