/**
 * SchedulerGroupDetailPage - Workflow group detail view (Figma Design D)
 */

import {
	ArrowLeft,
	Calendar,
	Clock,
	ExternalLink,
	MoreHorizontal,
	Search,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	getMockWorkflowDetail,
	MOCK_SCHEDULED_WORKFLOWS,
	WORKFLOW_GROUP_MAP,
	WORKFLOW_GROUPS,
} from "@/data/mock-scheduler";
import { cn } from "@/lib/utils";
import { calculateSuccessRate } from "@/types/scheduler";

type StatusFilter = "all" | "active" | "paused";

/**
 * Stat card component
 */
function StatCard({ value, label }: { value: string; label: string }) {
	return (
		<Card className="p-4 shadow-none rounded-sm">
			<p className="text-2xl font-heading text-foreground">{value}</p>
			<p className="text-sm text-muted-foreground">{label}</p>
		</Card>
	);
}

/**
 * Format date for display
 */
function formatDate(isoString: string | null): string {
	if (!isoString) return "--";
	const date = new Date(isoString);
	return `${date.toLocaleDateString("en-US", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})} ${date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	})}`;
}

export default function SchedulerGroupDetailPage() {
	const { groupId } = useParams<{ groupId: string }>();
	const navigate = useNavigate();
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
		null,
	);

	// Get selected workflow detail
	const selectedWorkflow = useMemo(() => {
		if (!selectedWorkflowId) return null;
		return getMockWorkflowDetail(selectedWorkflowId);
	}, [selectedWorkflowId]);

	// Get group info
	const group = WORKFLOW_GROUPS.find((g) => g.id === groupId);

	// Get workflows for this group
	const groupWorkflows = useMemo(() => {
		return MOCK_SCHEDULED_WORKFLOWS.filter(
			(w) => WORKFLOW_GROUP_MAP[w.id] === groupId,
		);
	}, [groupId]);

	// Filter workflows
	const filteredWorkflows = useMemo(() => {
		let filtered = groupWorkflows;

		// Status filter
		if (statusFilter === "active") {
			filtered = filtered.filter((w) => w.status === "enabled");
		} else if (statusFilter === "paused") {
			filtered = filtered.filter((w) => w.status === "disabled");
		}

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(w) =>
					w.name.toLowerCase().includes(query) ||
					w.description?.toLowerCase().includes(query),
			);
		}

		return filtered;
	}, [groupWorkflows, statusFilter, searchQuery]);

	// Calculate stats
	const stats = useMemo(() => {
		const totalRuns = groupWorkflows.reduce((sum, w) => sum + w.totalRuns, 0);
		const totalSuccess = groupWorkflows.reduce(
			(sum, w) => sum + w.successCount,
			0,
		);
		const successRate =
			totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 100;
		const healthy = groupWorkflows.filter(
			(w) => calculateSuccessRate(w) >= 90,
		).length;
		const needsAttention = groupWorkflows.filter(
			(w) => calculateSuccessRate(w) < 90,
		).length;
		return { totalRuns, successRate, healthy, needsAttention };
	}, [groupWorkflows]);

	// Check if group has any active workflows
	const hasActiveWorkflows = groupWorkflows.some((w) => w.status === "enabled");

	if (!group) {
		return (
			<RitaLayout activePage="scheduler">
				<div className="flex flex-col items-center justify-center h-[60vh]">
					<p className="text-muted-foreground">Group not found</p>
					<Button
						variant="ghost"
						onClick={() => navigate("/scheduler")}
						className="mt-4"
					>
						<ArrowLeft className="size-4 mr-2" />
						Back to Scheduler
					</Button>
				</div>
			</RitaLayout>
		);
	}

	return (
		<RitaLayout activePage="scheduler">
			<div className="flex flex-col h-[calc(100vh-64px)] bg-background">
				{/* Header */}
				<div className="px-6 py-4 border-b">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={() => navigate("/scheduler")}
						>
							<ArrowLeft className="size-4" />
						</Button>
						<h1 className="text-xl font-heading">{group.name}</h1>
						<Badge
							variant="outline"
							className={cn(
								"text-xs",
								hasActiveWorkflows
									? "text-emerald-600 border-emerald-300 bg-emerald-50"
									: "text-muted-foreground",
							)}
						>
							{hasActiveWorkflows ? "Active" : "Paused"}
						</Badge>
					</div>
				</div>

				{/* Stats Row */}
				<div className="px-6 py-4">
					<div className="grid grid-cols-4 gap-3">
						<StatCard
							value={stats.totalRuns.toLocaleString()}
							label="Total executions"
						/>
						<StatCard value={`${stats.successRate}%`} label="Success rate" />
						<StatCard
							value={stats.healthy.toString()}
							label="Healthy workflows"
						/>
						<StatCard
							value={stats.needsAttention.toString()}
							label="Needs Attention"
						/>
					</div>
				</div>

				{/* Filters Row */}
				<div className="px-6 py-3 flex items-center justify-between">
					{/* Status Tabs */}
					<div className="flex items-center border rounded-md overflow-hidden">
						{(["all", "active", "paused"] as StatusFilter[]).map((status) => (
							<button
								key={status}
								className={cn(
									"px-4 py-1.5 text-sm font-medium transition-colors",
									statusFilter === status
										? "bg-foreground text-background"
										: "bg-background text-foreground hover:bg-muted",
								)}
								onClick={() => setStatusFilter(status)}
							>
								{status.charAt(0).toUpperCase() + status.slice(1)}
							</button>
						))}
					</div>

					{/* Search */}
					<div className="relative w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search..."
							className="pl-9 h-9"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* Table */}
				<div className="flex-1 px-6 pb-6 overflow-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[250px]">Name</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="w-[100px]">Status</TableHead>
								<TableHead className="w-[180px]">Last Run</TableHead>
								<TableHead className="w-[180px]">Next Run</TableHead>
								<TableHead className="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredWorkflows.map((workflow) => (
								<TableRow
									key={workflow.id}
									className="cursor-pointer hover:bg-muted/50"
									onClick={() => setSelectedWorkflowId(workflow.id)}
								>
									<TableCell>
										<span className="text-primary">{workflow.name}</span>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{workflow.description || "--"}
									</TableCell>
									<TableCell>
										<Badge
											variant="outline"
											className={cn(
												"text-xs",
												workflow.status === "enabled"
													? "text-emerald-600 border-emerald-300"
													: "text-muted-foreground",
											)}
										>
											{workflow.status === "enabled" ? "Active" : "Paused"}
										</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{formatDate(workflow.lastRunTime)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{formatDate(workflow.nextRunTime)}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon" className="size-8">
													<MoreHorizontal className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => navigate(`/scheduler/${workflow.id}`)}
												>
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem>Run Now</DropdownMenuItem>
												<DropdownMenuItem>
													{workflow.status === "enabled" ? "Pause" : "Enable"}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
							{filteredWorkflows.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={6}
										className="text-center text-muted-foreground py-8"
									>
										No workflows found
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Workflow Detail Panel */}
				<Sheet
					open={!!selectedWorkflowId}
					onOpenChange={(open) => !open && setSelectedWorkflowId(null)}
				>
					<SheetContent className="!w-[640px] !max-w-[640px] p-0 overflow-auto">
						{selectedWorkflow && (
							<div className="flex flex-col h-full">
								{/* Header */}
								<div className="p-4 border-b space-y-2">
									<div className="flex items-start justify-between">
										<Badge
											variant="outline"
											className={cn(
												"text-xs",
												selectedWorkflow.status === "enabled"
													? "text-emerald-600 border-emerald-300 bg-emerald-50"
													: "text-muted-foreground",
											)}
										>
											{selectedWorkflow.status === "enabled"
												? "Active"
												: "Paused"}
										</Badge>
										<Button
											variant="ghost"
											size="icon"
											className="size-8 -mr-2 -mt-2"
											onClick={() => setSelectedWorkflowId(null)}
										>
											<X className="size-4" />
										</Button>
									</div>
									<h2 className="text-lg font-heading">
										{selectedWorkflow.name}
									</h2>
									<p className="text-sm text-muted-foreground">
										{selectedWorkflow.description || "Description"}
									</p>
								</div>

								{/* Schedule Info */}
								<div className="p-4 border-b grid grid-cols-2 gap-4">
									<div className="flex items-start gap-2">
										<Clock className="size-4 text-muted-foreground mt-0.5" />
										<div>
											<p className="text-xs text-muted-foreground">Next Run</p>
											<p className="text-sm">
												{formatDate(selectedWorkflow.nextRunTime)}
											</p>
										</div>
									</div>
									<div className="flex items-start gap-2">
										<Calendar className="size-4 text-muted-foreground mt-0.5" />
										<div>
											<p className="text-xs text-muted-foreground">Last Run</p>
											<p className="text-sm">
												{formatDate(selectedWorkflow.lastRunTime)}
											</p>
										</div>
									</div>
								</div>

								{/* Stats */}
								<div className="p-4 border-b grid grid-cols-3 gap-4">
									<div>
										<p className="text-2xl font-heading">
											{selectedWorkflow.totalRuns.toLocaleString()}
										</p>
										<p className="text-xs text-muted-foreground">Total runs</p>
									</div>
									<div>
										<p className="text-2xl font-heading">
											{selectedWorkflow.successCount.toLocaleString()}
										</p>
										<p className="text-xs text-muted-foreground">
											Successful runs
										</p>
									</div>
									<div>
										<p className="text-2xl font-heading">
											{selectedWorkflow.failureCount.toLocaleString()}
										</p>
										<p className="text-xs text-muted-foreground">Failed runs</p>
									</div>
								</div>

								{/* Recent Logs */}
								<div className="flex-1 p-4">
									<h3 className="text-sm font-medium mb-3">Recent logs</h3>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="text-xs">Timestamp</TableHead>
												<TableHead className="text-xs">Status</TableHead>
												<TableHead className="text-xs">Duration</TableHead>
												<TableHead className="text-xs w-8"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{selectedWorkflow.executions.slice(0, 10).map((exec) => (
												<TableRow key={exec.id}>
													<TableCell className="text-xs text-muted-foreground">
														{formatDate(exec.timestamp)}
													</TableCell>
													<TableCell>
														<span
															className={cn(
																"text-xs",
																exec.status === "success"
																	? "text-emerald-600"
																	: "text-red-500",
															)}
														>
															{exec.status === "success" ? "Success" : "Failed"}
														</span>
													</TableCell>
													<TableCell className="text-xs text-muted-foreground">
														{exec.durationMs
															? `${Math.floor(exec.durationMs / 60000)}m ${Math.floor((exec.durationMs % 60000) / 1000)}s`
															: "2m 34s"}
													</TableCell>
													<TableCell>
														{exec.logsUrl && (
															<a
																href={exec.logsUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="text-muted-foreground hover:text-foreground"
																onClick={(e) => e.stopPropagation()}
															>
																<ExternalLink className="size-3" />
															</a>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						)}
					</SheetContent>
				</Sheet>
			</div>
		</RitaLayout>
	);
}
