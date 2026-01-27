import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";

interface ChartDataPoint {
	month: string;
	manual: number;
	automated: number;
}

interface TicketTrendsChartProps {
	/** Chart data points with month, manual, and automated values */
	data?: ChartDataPoint[];
	/** Height of the chart in pixels (default: 192) */
	height?: number;
}

/**
 * TicketTrendsChart - Complete chart card showing manual vs automated ticket trends
 *
 * Displays a bordered card containing:
 * - Header with "Ticket Trends" title and info icon
 * - Description text showing tickets learned and automation percentage
 * - Dual-line chart comparing manual vs automated ticket handling over time
 * - Centered legend showing Manual (purple) and Automated (green)
 *
 * When no data is provided, displays an empty state with "Coming soon" message.
 *
 * @param data - Array of data points with month, manual, and automated values
 * @param height - Height of the chart in pixels (default: 192)
 *
 * @example
 * ```tsx
 * // With API data
 * <TicketTrendsChart data={ticketTrendsData} />
 *
 * // Empty state (no data)
 * <TicketTrendsChart />
 * ```
 */
export function TicketTrendsChart({
	data,
	height = 192,
}: TicketTrendsChartProps) {
	const { t } = useTranslation("tickets");

	const hasData = data && data.length > 0;

	return (
		<div className="rounded-lg border bg-background p-3">
			<div className="mb-6 flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<h2 className="font-semibold">{t("trends.title")}</h2>
					<Info className="h-4 w-4 text-muted-foreground" />
				</div>
				{hasData && (
					<p className="text-muted-foreground">
						{t("trends.description", {
							count: data.reduce((sum, d) => sum + d.manual + d.automated, 0),
							percentage:
								Math.round(
									(data.reduce((sum, d) => sum + d.automated, 0) /
										data.reduce((sum, d) => sum + d.manual + d.automated, 0)) *
										100,
								) || 0,
						})}
					</p>
				)}
			</div>

			{hasData ? (
				<div className="flex flex-col gap-4">
					{/* Chart */}
					<div className="w-full">
						<ResponsiveContainer width="100%" height={height}>
							<LineChart data={data}>
								<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
								<XAxis dataKey="month" stroke="#6b7280" />
								<YAxis stroke="#6b7280" />
								<Line
									type="monotone"
									dataKey="manual"
									stroke="#8b5cf6"
									strokeWidth={2}
									dot={{ fill: "#8b5cf6", r: 4 }}
								/>
								<Line
									type="monotone"
									dataKey="automated"
									stroke="#10b981"
									strokeWidth={2}
									dot={{ fill: "#10b981", r: 4 }}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>

					{/* Legend */}
					<div className="flex justify-center gap-4">
						<div className="flex items-center gap-2">
							<div
								className="h-3 w-3 rounded-xs"
								style={{ backgroundColor: "#8b5cf6" }}
							/>
							<span className="text-sm">{t("trends.legend.manual")}</span>
						</div>
						<div className="flex items-center gap-2">
							<div
								className="h-3 w-3 rounded-xs"
								style={{ backgroundColor: "#10b981" }}
							/>
							<span className="text-sm">{t("trends.legend.automated")}</span>
						</div>
					</div>
				</div>
			) : (
				<div
					className="flex items-center justify-center text-muted-foreground"
					style={{ height }}
				>
					<p>{t("trends.emptyState")}</p>
				</div>
			)}
		</div>
	);
}
