import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
	CartesianGrid,
	Cell,
	ReferenceLine,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
	ZAxis,
} from "recharts";
import { detectGapType } from "@/lib/tickets/utils";
import type { ClusterListItem } from "@/types/cluster";

interface PrioritizationChartProps {
	clusters: ClusterListItem[];
	/** When set, dims all other dots and highlights this cluster */
	highlightId?: string;
}

interface ChartPoint {
	id: string;
	name: string;
	x: number;
	y: number;
	z: number;
	ticketCount: number;
	fill: string;
}

const GAP_COLORS = {
	none: "#22c55e",
	knowledge: "#eab308",
} as const;

function getGapColor(cluster: ClusterListItem): string {
	const gap = detectGapType(cluster.kb_status);
	if (gap === "knowledge") return GAP_COLORS.knowledge;
	return GAP_COLORS.none;
}

function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: Array<{ payload: ChartPoint }>;
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

export function PrioritizationChart({
	clusters,
	highlightId,
}: PrioritizationChartProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();

	if (clusters.length === 0) return null;

	const maxTicketCount = Math.max(...clusters.map((c) => c.ticket_count), 1);

	const points: ChartPoint[] = clusters.map((c) => {
		const hasKb = c.kb_status === "FOUND" ? 1 : 0;
		const responseRatio =
			c.ticket_count > 0 ? c.needs_response_count / c.ticket_count : 0;

		return {
			id: c.id,
			name: c.subcluster_name ? `${c.name} - ${c.subcluster_name}` : c.name,
			x: (c.ticket_count / maxTicketCount) * 100,
			y: (hasKb * 0.6 + responseRatio * 0.4) * 100,
			z: c.ticket_count,
			ticketCount: c.ticket_count,
			fill: getGapColor(c),
		};
	});

	const handleClick = (point: ChartPoint) => {
		navigate(`/tickets/${point.id}`);
	};

	return (
		<div className="rounded-lg border bg-background p-3">
			<div className="mb-4 flex flex-col gap-1">
				<h2 className="font-semibold">{t("prioritization.title")}</h2>
				<p className="text-sm text-muted-foreground">
					{t("prioritization.description")}
				</p>
			</div>
			<ResponsiveContainer width="100%" height={300}>
				<ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
					<XAxis
						type="number"
						dataKey="x"
						domain={[0, 100]}
						name="Volume"
						stroke="#6b7280"
						tick={{ fontSize: 12 }}
					/>
					<YAxis
						type="number"
						dataKey="y"
						domain={[0, 100]}
						name="Readiness"
						stroke="#6b7280"
						tick={{ fontSize: 12 }}
					/>
					<ZAxis type="number" dataKey="z" range={[40, 400]} />
					<ReferenceLine x={50} stroke="#d1d5db" strokeDasharray="4 4" />
					<ReferenceLine y={50} stroke="#d1d5db" strokeDasharray="4 4" />
					<Tooltip content={<CustomTooltip />} />
					<Scatter data={points} onClick={handleClick} cursor="pointer">
						{points.map((p) => (
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
			<div className="mt-2 grid grid-cols-2 gap-1 text-center text-xs text-muted-foreground">
				<span>{t("prioritization.quadrants.easyWins")}</span>
				<span>{t("prioritization.quadrants.quickWins")}</span>
				<span>{t("prioritization.quadrants.deprioritize")}</span>
				<span>{t("prioritization.quadrants.strategic")}</span>
			</div>
		</div>
	);
}
