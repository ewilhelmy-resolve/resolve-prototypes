import { useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
} from "recharts";
import {
	Info,
	ChevronDown,
	ArrowUpDown,
	MoreHorizontal,
} from "lucide-react";
import { TicketDetailSidebar } from "@/components/tickets/TicketDetailSidebar";

// Map source names to icon paths
const getSourceIcon = (source: string): string => {
	const sourceMap: Record<string, string> = {
		ServiceNow: "/connections/icon_servicenow.svg",
		Confluence: "/connections/icon_confluence.svg",
		SharePoint: "/connections/icon_sharepoint.svg",
	};
	return sourceMap[source] || "/connections/icon_servicenow.svg";
};

const badges = [
	{ text: "976 tickets", variant: "secondary" as const },
	{ text: "14 open", variant: "secondary" as const },
	{ text: "12% automated", variant: "secondary" as const },
	{ text: "Knowledge found", variant: "outline" as const },
];

// Generate random chart data for demonstration
const generateChartData = () => {
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	return months.map((month) => ({
		month,
		manual: Math.floor(Math.random() * 60) + 40, // Random between 40-100
		automated: Math.floor(Math.random() * 30) + 5, // Random between 5-35
	}));
};

const chartData = generateChartData();

const tableData = [
	{
		id: 1,
		name: "Password Reset",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
	{
		id: 2,
		name: "VPN Connection Troubleshooting",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
	{
		id: 3,
		name: "Two-factor authentication setup",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
	{
		id: 4,
		name: "Phishing awareness guide",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
	{
		id: 5,
		name: "Email Configuration Setup",
		status: "Needs response",
		source: "ServiceNow",
		date: "03 Sep, 2025 18:07",
	},
];

export default function TicketDetailPage() {
	const { id } = useParams<{ id: string }>();

	// Convert id to title (replace hyphens with spaces and capitalize)
	const title = id
		? id
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ")
		: "Ticket Group";

	return (
		<RitaLayout activePage="tickets">
			<div className="flex min-h-screen flex-col lg:flex-row">
				{/* Main Content */}
				<div className="flex-1 p-4">
					<div className="flex flex-col gap-4">
						{/* Page Header */}
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
							<h1 className="text-xl font-medium">{title}</h1>
							<div className="flex flex-wrap gap-2">
								{badges.map((badge, index) => (
									<Badge key={index} variant={badge.variant}>
										{badge.text}
									</Badge>
								))}
							</div>
						</div>

						{/* Ticket Trends Chart */}
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

							<div className="mb-4 h-48">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={chartData}>
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

							<div className="flex gap-4 justify-center">
								<div className="flex items-center gap-2">
									<div className="h-3 w-3 rounded-xs" style={{ backgroundColor: "#8b5cf6" }} />
									<span className="text-sm">Manual</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="h-3 w-3 rounded-xs" style={{ backgroundColor: "#10b981" }} />
									<span className="text-sm">Automated</span>
								</div>
							</div>
						</div>

						{/* Table Section */}
						<div className="flex flex-col gap-3">
							{/* Filters */}
							<div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
								<Tabs defaultValue="needs-response" className="w-fit">
									<TabsList>
										<TabsTrigger value="needs-response">
											Needs Response
										</TabsTrigger>
										<TabsTrigger value="completed">Completed</TabsTrigger>
									</TabsList>
								</Tabs>

								<div className="flex gap-2">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="secondary">
												Source: All
												<ChevronDown className="ml-2 h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent>
											<DropdownMenuItem>All Sources</DropdownMenuItem>
											<DropdownMenuItem>ServiceNow</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>

									<Input placeholder="Search tickets....." className="w-40" />
								</div>
							</div>

							{/* Table */}
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-8">
												<Checkbox />
											</TableHead>
											<TableHead>Name</TableHead>
											<TableHead>
												<Button variant="ghost" className="h-auto p-0">
													Status
													<ArrowUpDown className="ml-2 h-4 w-4" />
												</Button>
											</TableHead>
											<TableHead>
												<Button variant="ghost" className="h-auto p-0">
													Source
													<ArrowUpDown className="ml-2 h-4 w-4" />
												</Button>
											</TableHead>
											<TableHead className="text-right">
												Created Modified
											</TableHead>
											<TableHead className="w-16" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{tableData.map((row) => (
											<TableRow key={row.id}>
												<TableCell>
													<Checkbox />
												</TableCell>
												<TableCell className="font-medium text-primary">
													{row.name}
												</TableCell>
												<TableCell>
													<Badge variant="outline">{row.status}</Badge>
												</TableCell>
												<TableCell className="text-center">
													<div className="flex justify-center">
														<img
															src={getSourceIcon(row.source)}
															alt={row.source}
															className="h-4 w-4"
														/>
													</div>
												</TableCell>
												<TableCell className="text-right text-sm">
													{row.date}
												</TableCell>
												<TableCell>
													<Button variant="ghost" size="icon">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Table Footer */}
							<div className="flex items-center justify-between py-4">
								<p className="text-sm text-muted-foreground">
									12 Knowledge articles
								</p>
								<div className="flex gap-2">
									<Button variant="outline" disabled>
										Previous
									</Button>
									<Button variant="outline" disabled>
										Next
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Right Sidebar */}
				<TicketDetailSidebar knowledgeCount={3} />
			</div>
		</RitaLayout>
	);
}
