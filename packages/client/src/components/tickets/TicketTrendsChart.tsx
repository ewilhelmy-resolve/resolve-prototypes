import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import {
	Tooltip as UITooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDemoStore } from "@/stores/demo-store";

interface ChartDataPoint {
	month: string;
	manual: number;
	autoRespond: number;
	autoPopulate: number;
	autoResolve: number;
}

interface TicketTrendsChartProps {
	/** Total tickets learned (for subtitle) */
	ticketsLearned?: number;
}

// Before automation: Only manual tickets, steady high volume
const BEFORE_DATA: ChartDataPoint[] = [
	{ month: "Dec", manual: 85, autoRespond: 0, autoPopulate: 0, autoResolve: 0 },
	{ month: "Jan", manual: 95, autoRespond: 0, autoPopulate: 0, autoResolve: 0 },
	{ month: "Feb", manual: 88, autoRespond: 0, autoPopulate: 0, autoResolve: 0 },
	{ month: "Mar", manual: 92, autoRespond: 0, autoPopulate: 0, autoResolve: 0 },
	{ month: "Apr", manual: 90, autoRespond: 0, autoPopulate: 0, autoResolve: 0 },
	{ month: "May", manual: 87, autoRespond: 0, autoPopulate: 0, autoResolve: 0 },
];

// After automation: Manual decreases, Auto-Respond increases
const AFTER_DATA: ChartDataPoint[] = [
	{ month: "Dec", manual: 85, autoRespond: 0, autoPopulate: 0, autoResolve: 0 },
	{ month: "Jan", manual: 95, autoRespond: 5, autoPopulate: 0, autoResolve: 0 },
	{ month: "Feb", manual: 65, autoRespond: 27, autoPopulate: 0, autoResolve: 0 },
	{ month: "Mar", manual: 45, autoRespond: 48, autoPopulate: 0, autoResolve: 0 },
	{ month: "Apr", manual: 25, autoRespond: 68, autoPopulate: 0, autoResolve: 0 },
	{ month: "May", manual: 10, autoRespond: 85, autoPopulate: 0, autoResolve: 0 },
];

// Line colors from Figma
const LINE_COLORS = {
	manual: "#164e63", // dark teal
	autoRespond: "#8b5cf6", // purple
	autoPopulate: "#0d9488", // teal
	autoResolve: "#fbbf24", // yellow/amber
};

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
	if (!active || !payload) return null;

	// Filter out lines with 0 values
	const visiblePayload = payload.filter((entry: any) => entry.value > 0);
	if (visiblePayload.length === 0) return null;

	return (
		<div className="rounded-md border bg-popover p-4 shadow-md">
			<p className="text-sm font-medium mb-2">{label} 2026</p>
			{visiblePayload.map((entry: any, index: number) => (
				<div key={index} className="flex items-center justify-between gap-8">
					<div className="flex items-center gap-2">
						<div
							className="h-3 w-3 rounded-xs"
							style={{ backgroundColor: entry.color }}
						/>
						<span className="text-sm">{entry.name}</span>
					</div>
					<span className="text-sm font-medium">{entry.value}</span>
				</div>
			))}
		</div>
	);
}

/**
 * TicketTrendsChart - Chart showing ticket handling trends over time
 *
 * Before automation enabled: Shows only Manual line (high steady volume)
 * After automation enabled: Shows Manual decreasing + Auto-Respond increasing
 */
export function TicketTrendsChart({
	ticketsLearned = 976,
}: TicketTrendsChartProps) {
	const { t } = useTranslation("tickets");
	const { ticketsAutomated, automationRate } = useDemoStore();

	// Use different data based on whether automation is enabled
	const isAutomationEnabled = ticketsAutomated > 0;
	const data = isAutomationEnabled ? AFTER_DATA : BEFORE_DATA;

	return (
		<div className="rounded-lg border bg-background p-3">
			<div className="mb-4 flex flex-col gap-2">
				<div className="flex items-center gap-1.5">
					<h2 className="text-base font-semibold">{t("trends.title")}</h2>
					<UITooltip>
						<TooltipTrigger asChild>
							<button type="button" className="text-muted-foreground hover:text-foreground">
								<Info className="h-5 w-5" />
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Ticket handling trends over time</p>
						</TooltipContent>
					</UITooltip>
				</div>
				<p className="text-base text-muted-foreground">
					{t("trends.description", { count: ticketsLearned, percentage: automationRate })}
				</p>
			</div>

			<div className="flex flex-col gap-4">
				{/* Chart */}
				<div className="w-full">
					<ResponsiveContainer width="100%" height={280}>
						<LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
							<CartesianGrid
								strokeDasharray="0"
								stroke="#f1f5f9"
								vertical={true}
								horizontal={false}
							/>
							<XAxis
								dataKey="month"
								stroke="#0a0a0a"
								tick={{ fontSize: 14 }}
								axisLine={{ stroke: "#e5e5e5" }}
								tickLine={false}
							/>
							<YAxis
								stroke="#0a0a0a"
								tick={{ fontSize: 14 }}
								axisLine={{ stroke: "#e5e5e5" }}
								tickLine={false}
								domain={[0, 125]}
								ticks={[0, 50, 75, 100, 125]}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Line
								type="monotone"
								dataKey="manual"
								name="Manual"
								stroke={LINE_COLORS.manual}
								strokeWidth={2}
								dot={{ fill: LINE_COLORS.manual, r: 4, strokeWidth: 2, stroke: "#fff" }}
								activeDot={{ r: 6 }}
							/>
							{/* Only show Auto-Respond line when automation is enabled */}
							{isAutomationEnabled && (
								<Line
									type="monotone"
									dataKey="autoRespond"
									name="Auto-Respond"
									stroke={LINE_COLORS.autoRespond}
									strokeWidth={2}
									dot={{ fill: LINE_COLORS.autoRespond, r: 4, strokeWidth: 2, stroke: "#fff" }}
									activeDot={{ r: 6 }}
								/>
							)}
						</LineChart>
					</ResponsiveContainer>
				</div>

				{/* Legend - only show enabled categories */}
				<div className="flex gap-6 justify-center flex-wrap">
					<div className="flex items-center gap-2">
						<div
							className="h-3 w-3 rounded-xs"
							style={{ backgroundColor: LINE_COLORS.manual }}
						/>
						<span className="text-sm">Manual</span>
					</div>
					{isAutomationEnabled && (
						<div className="flex items-center gap-2">
							<div
								className="h-3 w-3 rounded-xs"
								style={{ backgroundColor: LINE_COLORS.autoRespond }}
							/>
							<span className="text-sm">Auto-Respond</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
