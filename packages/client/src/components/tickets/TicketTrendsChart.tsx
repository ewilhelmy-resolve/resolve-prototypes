import { Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
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

// Generate random chart data for demonstration
const generateChartData = (): ChartDataPoint[] => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months.map((month) => ({
    month,
    manual: Math.floor(Math.random() * 60) + 40, // Random between 40-100
    automated: Math.floor(Math.random() * 30) + 5, // Random between 5-35
  }));
};

/**
 * TicketTrendsChart - Complete chart card showing manual vs automated ticket trends
 *
 * Displays a bordered card containing:
 * - Header with "Ticket Trends" title and info icon
 * - Description text showing tickets learned and automation percentage
 * - Dual-line chart comparing manual vs automated ticket handling over time
 * - Centered legend showing Manual (purple) and Automated (green)
 *
 * @param data - Array of data points with month, manual, and automated values (generates random data if not provided)
 * @param height - Height of the chart in pixels (default: 192)
 *
 * @example
 * ```tsx
 * // Basic usage with default random data
 * <TicketTrendsChart />
 *
 * // With custom API data
 * <TicketTrendsChart data={ticketTrendsData} />
 *
 * // With taller chart (256px)
 * <TicketTrendsChart height={256} />
 * ```
 */
export function TicketTrendsChart({
  data = generateChartData(),
  height = 192,
}: TicketTrendsChartProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Ticket Trends</h2>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">
          Rita learned from 976 tickets, automatically handled 0%
        </p>
      </div>

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
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-xs"
              style={{ backgroundColor: "#8b5cf6" }}
            />
            <span className="text-sm">Manual</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-xs"
              style={{ backgroundColor: "#10b981" }}
            />
            <span className="text-sm">Automated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
