/**
 * SchedulerDashboardPage - Workflow monitoring with design exploration
 */

import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	type Circle,
	Clock,
	Columns3,
	ExternalLink,
	Filter,
	Kanban,
	LayoutGrid,
	List,
	PauseCircle,
	RefreshCw,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ActionsLayout } from "@/components/layouts/ActionsLayout";
import RitaLayout from "@/components/layouts/RitaLayout";
import { MainHeader } from "@/components/MainHeader";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import { WorkflowCard } from "@/components/scheduler/WorkflowCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	getMockWorkflowDetail,
	MOCK_SCHEDULED_WORKFLOWS,
	WORKFLOW_GROUP_MAP,
	WORKFLOW_GROUPS,
} from "@/data/mock-scheduler";
import { cn } from "@/lib/utils";
import type {
	ScheduledWorkflow,
	WorkflowDetail,
	WorkflowStatus,
} from "@/types/scheduler";
import { calculateSuccessRate } from "@/types/scheduler";

type DesignMode = "original" | "grouped" | "linear" | "figma" | "kanban";
type LayoutMode = "grid" | "grouped" | "list";
type LinearLayoutMode = "table" | "board";
type FilterStatus = "all" | WorkflowStatus;
type FigmaViewMode = "grid" | "list";
type GroupHealthFilter = "all" | "healthy" | "needs-attention";

// Status categories for Linear board view
type WorkflowHealthStatus =
	| "queued"
	| "healthy"
	| "warning"
	| "critical"
	| "paused";

function getWorkflowHealthStatus(
	workflow: ScheduledWorkflow,
): WorkflowHealthStatus {
	if (workflow.status === "disabled") return "paused";
	const successRate = calculateSuccessRate(workflow);
	const nextRunDate = new Date(workflow.nextRunTime);
	const now = new Date();
	const minsUntilNext = Math.round(
		(nextRunDate.getTime() - now.getTime()) / (1000 * 60),
	);

	if (minsUntilNext <= 15 && minsUntilNext > 0) return "queued";
	if (successRate < 70) return "critical";
	if (successRate < 90) return "warning";
	return "healthy";
}

const HEALTH_STATUS_CONFIG: Record<
	WorkflowHealthStatus,
	{ label: string; icon: typeof Circle; color: string; bg: string }
> = {
	queued: {
		label: "Queued",
		icon: Clock,
		color: "text-blue-500",
		bg: "bg-blue-500/10",
	},
	healthy: {
		label: "Healthy",
		icon: CheckCircle2,
		color: "text-emerald-500",
		bg: "bg-emerald-500/10",
	},
	warning: {
		label: "Warning",
		icon: AlertCircle,
		color: "text-amber-500",
		bg: "bg-amber-500/10",
	},
	critical: {
		label: "Critical",
		icon: AlertCircle,
		color: "text-red-500",
		bg: "bg-red-500/10",
	},
	paused: {
		label: "Paused",
		icon: PauseCircle,
		color: "text-muted-foreground",
		bg: "bg-muted",
	},
};

function formatRelativeTime(isoString: string | null): string {
	if (!isoString) return "Never";
	const date = new Date(isoString);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffMins = Math.round(diffMs / (1000 * 60));
	const diffHours = Math.round(diffMs / (1000 * 60 * 60));

	if (diffMs < 0) {
		const abs = Math.abs(diffMins);
		if (abs < 60) return `${abs}m ago`;
		return `${Math.abs(diffHours)}h ago`;
	}
	if (diffMins < 60) return `in ${diffMins}m`;
	return `in ${diffHours}h`;
}

/**
 * Sparkline - mini bar chart
 */
function Sparkline({ executions }: { executions: ("success" | "failed")[] }) {
	return (
		<div className="flex items-end gap-px h-3">
			{executions.slice(-12).map((status, i) => (
				<div
					key={i}
					className={cn(
						"w-1 rounded-sm h-full",
						status === "success" ? "bg-emerald-500" : "bg-red-400",
					)}
				/>
			))}
		</div>
	);
}

/**
 * Compact workflow card for grid/grouped views
 * Left border color indicates health at a glance
 */
function WorkflowTile({
	workflow,
	onClick,
	isSelected,
}: {
	workflow: ScheduledWorkflow;
	onClick: () => void;
	isSelected?: boolean;
}) {
	const successRate = calculateSuccessRate(workflow);
	const isWarning = successRate >= 70 && successRate < 90;
	const isCritical = successRate < 70;

	// Determine if workflow is "queued" (next run coming soon)
	const nextRunDate = new Date(workflow.nextRunTime);
	const now = new Date();
	const minsUntilNext = Math.round(
		(nextRunDate.getTime() - now.getTime()) / (1000 * 60),
	);
	const isQueued = minsUntilNext <= 15 && minsUntilNext > 0;

	return (
		<Card
			className={cn(
				"cursor-pointer transition-all overflow-hidden",
				"hover:shadow-sm hover:border-primary/30",
				isSelected && "ring-2 ring-primary border-primary",
				workflow.status === "disabled" && "opacity-50",
			)}
			onClick={onClick}
		>
			<div className="flex">
				{/* Status indicator bar */}
				<div
					className={cn(
						"w-1 flex-shrink-0",
						workflow.status === "disabled"
							? "bg-muted-foreground/30"
							: isCritical
								? "bg-red-500"
								: isWarning
									? "bg-amber-500"
									: "bg-emerald-500",
					)}
				/>

				<div className="flex-1 p-3 space-y-2">
					{/* Header */}
					<div className="flex items-start justify-between gap-2">
						<h4 className="text-sm font-medium leading-tight line-clamp-2">
							{workflow.name}
						</h4>
						{workflow.status === "disabled" ? (
							<Badge
								variant="secondary"
								className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
							>
								Paused
							</Badge>
						) : isQueued ? (
							<Badge className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-100">
								Queued
							</Badge>
						) : null}
					</div>

					{/* Next run - prominent */}
					<div className="text-xs">
						<span
							className={cn(
								"font-medium",
								isQueued ? "text-blue-600" : "text-muted-foreground",
							)}
						>
							{workflow.status === "disabled"
								? "Paused"
								: `Next ${formatRelativeTime(workflow.nextRunTime)}`}
						</span>
					</div>

					{/* Sparkline + Health */}
					<div className="flex items-center gap-3">
						<Sparkline executions={workflow.recentExecutions} />
						<span
							className={cn(
								"text-xs font-semibold tabular-nums",
								isCritical
									? "text-red-600"
									: isWarning
										? "text-amber-600"
										: "text-emerald-600",
							)}
						>
							{successRate}%
						</span>
					</div>

					{/* Health bar */}
					<div className="h-1 bg-red-100 rounded-full overflow-hidden">
						<div
							className={cn(
								"h-full rounded-full",
								isCritical
									? "bg-red-500"
									: isWarning
										? "bg-amber-500"
										: "bg-emerald-500",
							)}
							style={{ width: `${successRate}%` }}
						/>
					</div>
				</div>
			</div>
		</Card>
	);
}

/**
 * List row for list view
 */
function WorkflowRow({
	workflow,
	onClick,
	isSelected,
}: {
	workflow: ScheduledWorkflow;
	onClick: () => void;
	isSelected?: boolean;
}) {
	const successRate = calculateSuccessRate(workflow);
	const isHealthy = successRate >= 90;
	const isWarning = successRate >= 70 && successRate < 90;

	return (
		<div
			role="button"
			tabIndex={0}
			className={cn(
				"flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors",
				"hover:bg-muted/50 border-b border-border/50",
				isSelected && "bg-primary/5",
			)}
			onClick={onClick}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
		>
			<div
				className={cn(
					"size-2 rounded-full flex-shrink-0",
					isHealthy
						? "bg-emerald-500"
						: isWarning
							? "bg-amber-500"
							: "bg-red-500",
				)}
			/>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{workflow.name}</p>
				<p className="text-xs text-muted-foreground truncate">
					{workflow.description}
				</p>
			</div>
			<div className="text-xs text-muted-foreground w-20 text-right">
				{formatRelativeTime(workflow.lastRunTime)}
			</div>
			<div className="text-xs text-muted-foreground w-20 text-right">
				{formatRelativeTime(workflow.nextRunTime)}
			</div>
			<div
				className={cn(
					"text-xs font-medium w-12 text-right",
					isHealthy
						? "text-emerald-600"
						: isWarning
							? "text-amber-600"
							: "text-red-600",
				)}
			>
				{successRate}%
			</div>
		</div>
	);
}

/**
 * Linear-style table row
 */
function LinearTableRow({
	workflow,
	onClick,
	isSelected,
}: {
	workflow: ScheduledWorkflow;
	onClick: () => void;
	isSelected?: boolean;
}) {
	const successRate = calculateSuccessRate(workflow);
	const status = getWorkflowHealthStatus(workflow);
	const config = HEALTH_STATUS_CONFIG[status];
	const StatusIcon = config.icon;

	return (
		<div
			role="button"
			tabIndex={0}
			className={cn(
				"flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
				"hover:bg-muted/50",
				isSelected && "bg-muted",
			)}
			onClick={onClick}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
		>
			<StatusIcon className={cn("size-4 flex-shrink-0", config.color)} />
			<span className="flex-1 text-sm truncate">{workflow.name}</span>
			<span className="text-xs text-muted-foreground w-16 text-right">
				{formatRelativeTime(workflow.nextRunTime)}
			</span>
			<div className="w-12 flex justify-end">
				<span
					className={cn(
						"text-xs font-medium px-1.5 py-0.5 rounded",
						config.bg,
						config.color,
					)}
				>
					{successRate}%
				</span>
			</div>
		</div>
	);
}

/**
 * Linear-style board card
 */
function LinearBoardCard({
	workflow,
	onClick,
	isSelected,
}: {
	workflow: ScheduledWorkflow;
	onClick: () => void;
	isSelected?: boolean;
}) {
	const successRate = calculateSuccessRate(workflow);
	const status = getWorkflowHealthStatus(workflow);
	const isQueued = status === "queued";

	return (
		<div
			role="button"
			tabIndex={0}
			className={cn(
				"p-3 rounded-lg cursor-pointer transition-all",
				"bg-card border border-border/50",
				"hover:border-border hover:shadow-sm",
				isSelected && "ring-2 ring-primary",
			)}
			onClick={onClick}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
		>
			<div className="space-y-2">
				<p className="text-sm font-medium leading-tight">{workflow.name}</p>
				<div className="flex items-center justify-between">
					<span className="text-[10px] text-muted-foreground">
						Last: {formatRelativeTime(workflow.lastRunTime)}
					</span>
					<div className="flex items-center gap-1">
						<div className="flex gap-px">
							{workflow.recentExecutions.slice(-5).map((exec, i) => (
								<div
									key={i}
									className={cn(
										"w-1 h-2 rounded-sm",
										exec === "success" ? "bg-emerald-500" : "bg-red-400",
									)}
								/>
							))}
						</div>
						<span
							className={cn(
								"text-[10px] ml-1 px-1.5 py-0.5 rounded",
								isQueued
									? "bg-blue-100 text-blue-700 font-medium"
									: "text-muted-foreground",
							)}
						>
							{isQueued ? "Queued" : `${successRate}%`}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Figma-style group card for Design D
 */
function FigmaGroupCard({
	group,
	workflows,
	onClick,
}: {
	group: { id: string; name: string };
	workflows: ScheduledWorkflow[];
	onClick: () => void;
}) {
	const totalRuns = workflows.reduce((sum, w) => sum + w.totalRuns, 0);
	const totalSuccess = workflows.reduce((sum, w) => sum + w.successCount, 0);
	const totalFailure = workflows.reduce((sum, w) => sum + w.failureCount, 0);
	const successRate =
		totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 100;
	const failureRate =
		totalRuns > 0 ? Math.round((totalFailure / totalRuns) * 100) : 0;

	return (
		<Card
			className={cn(
				"cursor-pointer hover:border-border/80 transition-colors overflow-hidden rounded-sm shadow-none !py-0 !gap-0",
			)}
			onClick={onClick}
		>
			<div className="px-3 py-3 space-y-1">
				{/* Group name */}
				<p className="text-sm text-foreground">{group.name}</p>

				{/* Workflow count */}
				<p className="text-3xl font-heading text-foreground">
					{workflows.length}
				</p>

				{/* Progress bar - failed first, then success */}
				<div className="h-2 rounded-full overflow-hidden flex">
					{failureRate > 0 && (
						<div
							className="h-full bg-red-400"
							style={{ width: `${failureRate}%` }}
						/>
					)}
					<div
						className="h-full bg-teal-400"
						style={{ width: `${successRate}%` }}
					/>
				</div>

				{/* Legend */}
				<div className="flex items-center justify-between text-xs">
					<div className="flex items-center gap-1">
						<div className="size-1.5 rounded-full bg-red-400" />
						<span className="text-muted-foreground">Failed</span>
						<span className="text-red-500">{failureRate}%</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="size-1.5 rounded-full bg-teal-400" />
						<span className="text-muted-foreground">Success</span>
						<span className="text-teal-600">{successRate}%</span>
					</div>
				</div>
			</div>
		</Card>
	);
}

/**
 * Kanban workflow card - matches Figma design
 */
// Custom status icons
function SuccessIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M0 6C0 2.68629 2.68629 0 6 0H14C17.3137 0 20 2.68629 20 6V14C20 17.3137 17.3137 20 14 20H6C2.68629 20 0 17.3137 0 14V6Z"
				fill="#F0FDF4"
			/>
			<g clipPath="url(#clip0_success)">
				<path
					d="M8.5 10L9.5 11L11.5 9M15 10C15 12.7614 12.7614 15 10 15C7.23858 15 5 12.7614 5 10C5 7.23858 7.23858 5 10 5C12.7614 5 15 7.23858 15 10Z"
					stroke="#22C55E"
					strokeWidth="1.25"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</g>
			<defs>
				<clipPath id="clip0_success">
					<rect
						width="12"
						height="12"
						fill="white"
						transform="translate(4 4)"
					/>
				</clipPath>
			</defs>
		</svg>
	);
}

function ScheduledIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M0 6C0 2.68629 2.68629 0 6 0H14C17.3137 0 20 2.68629 20 6V14C20 17.3137 17.3137 20 14 20H6C2.68629 20 0 17.3137 0 14V6Z"
				fill="#F5F5F5"
			/>
			<path
				d="M6.5 15H13.5M6.5 5H13.5M12.5 15V12.914C12.4999 12.6488 12.3945 12.3945 12.207 12.207L10 10M10 10L7.793 12.207C7.60545 12.3945 7.50006 12.6488 7.5 12.914V15M10 10L7.793 7.793C7.60545 7.60551 7.50006 7.35119 7.5 7.086V5M10 10L12.207 7.793C12.3945 7.60551 12.4999 7.35119 12.5 7.086V5"
				stroke="#525252"
				strokeWidth="1.25"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function FailedIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M0 6C0 2.68629 2.68629 0 6 0H14C17.3137 0 20 2.68629 20 6V14C20 17.3137 17.3137 20 14 20H6C2.68629 20 0 17.3137 0 14V6Z"
				fill="#FEF2F2"
			/>
			<g clipPath="url(#clip0_failed)">
				<path
					d="M10 8V10M10 12H10.005M7.93 5H12.07L15 7.93V12.07L12.07 15H7.93L5 12.07V7.93L7.93 5Z"
					stroke="#DC2626"
					strokeWidth="1.25"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</g>
			<defs>
				<clipPath id="clip0_failed">
					<rect
						width="12"
						height="12"
						fill="white"
						transform="translate(4 4)"
					/>
				</clipPath>
			</defs>
		</svg>
	);
}

function ExecutingIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M0 6C0 2.68629 2.68629 0 6 0H14C17.3137 0 20 2.68629 20 6V14C20 17.3137 17.3137 20 14 20H6C2.68629 20 0 17.3137 0 14V6Z"
				fill="#FEFCE8"
			/>
			<g clipPath="url(#clip0_executing)">
				<path
					d="M10 7V10H7.75M15 10C15 12.7614 12.7614 15 10 15C7.23858 15 5 12.7614 5 10C5 7.23858 7.23858 5 10 5C12.7614 5 15 7.23858 15 10Z"
					stroke="#CA8A04"
					strokeWidth="1.25"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</g>
			<defs>
				<clipPath id="clip0_executing">
					<rect width="12" height="12" fill="white" transform="translate(4 4)" />
				</clipPath>
			</defs>
		</svg>
	);
}

function KanbanWorkflowCard({
	workflow,
	onClick,
	isSelected,
}: {
	workflow: ScheduledWorkflow;
	onClick: () => void;
	isSelected?: boolean;
}) {
	const successRate = calculateSuccessRate(workflow);
	const isDisabled = workflow.status === "disabled";
	const isFailed = workflow.status === "enabled" && successRate < 70;

	// Determine status bar color
	const statusBarColor = isDisabled
		? "bg-transparent"
		: isFailed
			? "bg-red-500"
			: "bg-emerald-500";

	return (
		<div
			role="button"
			tabIndex={0}
			className={cn(
				"bg-background border rounded-sm cursor-pointer transition-all hover:bg-muted/30 flex overflow-hidden",
				isSelected && "ring-2 ring-primary",
			)}
			onClick={onClick}
			onKeyDown={(e) => e.key === "Enter" && onClick?.()}
		>
			{/* Left status bar */}
			<div className={cn("w-1 shrink-0", statusBarColor)} />

			{/* Content */}
			<div className="flex-1 p-2 sm:p-3 min-w-0">
				{/* Icon + Name + Gauge row */}
				<div className="flex items-center gap-2">
					{/* Status icon */}
					{isDisabled ? (
						<ScheduledIcon className="size-5 shrink-0" />
					) : isFailed ? (
						<FailedIcon className="size-5 shrink-0" />
					) : (
						<SuccessIcon className="size-5 shrink-0" />
					)}

					<p
						className={cn(
							"text-sm truncate flex-1 min-w-0",
							isDisabled && "text-muted-foreground",
						)}
					>
						{workflow.name}
					</p>

					<div className="flex items-center gap-1 shrink-0">
						<div className="flex items-end gap-px h-2.5 hidden sm:flex">
							{workflow.recentExecutions.slice(-8).map((status, i) => (
								<div
									key={i}
									className={cn(
										"w-1 rounded-sm h-full",
										isDisabled
											? "bg-muted-foreground/40"
											: status === "success"
												? "bg-emerald-500"
												: "bg-red-400",
									)}
								/>
							))}
						</div>
						<span
							className={cn(
								"text-xs sm:text-sm tabular-nums",
								isDisabled && "text-muted-foreground",
							)}
						>
							{successRate}%
						</span>
					</div>
				</div>

				{/* Run times */}
				<div
					className={cn(
						"mt-1 space-y-0.5 text-[11px] sm:text-xs",
						isDisabled && "text-muted-foreground",
					)}
				>
					<div className="flex gap-1 sm:gap-2">
						<span className={cn("shrink-0", !isDisabled && "text-foreground")}>
							Last run:
						</span>
						<span className="text-muted-foreground truncate">
							{formatDate(workflow.lastRunTime)}
						</span>
					</div>
					<div className="flex gap-1 sm:gap-2">
						<span className={cn("shrink-0", !isDisabled && "text-foreground")}>
							Next run:
						</span>
						<span className="text-muted-foreground truncate">
							{formatDate(workflow.nextRunTime)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Format date for display - "Feb 2, 2026, 12:00 PM"
 */
function formatDate(isoString: string | null): string {
	if (!isoString) return "--";
	const date = new Date(isoString);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

/**
 * Helper to get workflow status for filtering
 */
const EXECUTING_WORKFLOW_IDS = [
	"wf-3",
	"wf-12",
	"wf-17",
	"wf-22",
	"wf-9",
	"wf-20",
];

function getWorkflowFilterStatus(
	workflow: ScheduledWorkflow,
): "healthy" | "failed" | "scheduled" | "executing" {
	if (workflow.status === "disabled") return "scheduled";
	const rate = calculateSuccessRate(workflow);
	if (rate < 70) return "failed";
	if (EXECUTING_WORKFLOW_IDS.includes(workflow.id)) return "executing";
	return "healthy";
}

/**
 * Detail panel content - Figma style
 */
function WorkflowDetailPanel({
	detail,
	onClose,
}: {
	detail: WorkflowDetail;
	onClose: () => void;
}) {
	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="p-4 border-b space-y-2">
				<div className="flex items-start justify-between">
					<Badge
						variant="outline"
						className={cn(
							"text-xs",
							detail.status === "enabled"
								? "text-emerald-600 border-emerald-300 bg-emerald-50"
								: "text-muted-foreground",
						)}
					>
						{detail.status === "enabled" ? "Active" : "Paused"}
					</Badge>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 -mr-2 -mt-2"
						onClick={onClose}
					>
						<X className="size-4" />
					</Button>
				</div>
				<h2 className="text-lg font-heading">{detail.name}</h2>
				<p className="text-sm text-muted-foreground">
					{detail.description || "No description"}
				</p>
			</div>

			{/* Schedule Info */}
			<div className="p-4 border-b grid grid-cols-2 gap-4">
				<div className="flex items-start gap-2">
					<Calendar className="size-4 text-muted-foreground mt-0.5" />
					<div>
						<p className="text-xs text-muted-foreground">Last Run</p>
						<p className="text-sm">{detail.status === "disabled" ? "--" : formatDate(detail.lastRunTime)}</p>
					</div>
				</div>
				<div className="flex items-start gap-2">
					<Clock className="size-4 text-muted-foreground mt-0.5" />
					<div>
						<p className="text-xs text-muted-foreground">Next Run</p>
						<p className="text-sm">{formatDate(detail.nextRunTime)}</p>
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="p-4 border-b grid grid-cols-3 gap-4">
				<div>
					<p className="text-2xl font-heading">
						{detail.totalRuns.toLocaleString()}
					</p>
					<p className="text-xs text-muted-foreground">Total runs</p>
				</div>
				<div>
					<p className="text-2xl font-heading">
						{detail.successCount.toLocaleString()}
					</p>
					<p className="text-xs text-muted-foreground">Successful runs</p>
				</div>
				<div>
					<p className="text-2xl font-heading">
						{detail.failureCount.toLocaleString()}
					</p>
					<p className="text-xs text-muted-foreground">Failed runs</p>
				</div>
			</div>

			{/* Recent Logs */}
			<div className="flex-1 p-4 overflow-auto">
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
						{detail.executions.slice(0, 10).map((exec) => (
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
	);
}

export default function SchedulerDashboardPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const isActionsNav = searchParams.get("nav") === "actions";
	const [designMode, setDesignMode] = useState<DesignMode>("kanban");
	const [layoutMode, setLayoutMode] = useState<LayoutMode>("grouped");
	const [linearLayoutMode, setLinearLayoutMode] =
		useState<LinearLayoutMode>("table");
	const [selectedGroup, setSelectedGroup] = useState("all");
	const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
		new Set(WORKFLOW_GROUPS.map((g) => g.id)),
	);
	const [figmaViewMode, setFigmaViewMode] = useState<FigmaViewMode>("grid");
	const [groupHealthFilter, setGroupHealthFilter] =
		useState<GroupHealthFilter>("all");
	const [kanbanGroupBy, setKanbanGroupBy] = useState<"tags" | "none">("none");
	const [kanbanDisplay, setKanbanDisplay] = useState<"kanban" | "list">(
		"list",
	);
	const [timeFilter, setTimeFilter] = useState<"7days" | "15days" | "all">("7days");
	const [kanbanFilters, setKanbanFilters] = useState<
		Set<"failed" | "scheduled" | "executing" | "healthy">
	>(new Set());
	const [expandedKanbanGroups, setExpandedKanbanGroups] = useState<Set<string>>(
		new Set(WORKFLOW_GROUPS.map((g) => g.id)),
	);

	// Toggle kanban filter
	const toggleKanbanFilter = (filter: "failed" | "scheduled" | "executing" | "healthy") => {
		setKanbanFilters((prev) => {
			const next = new Set(prev);
			if (next.has(filter)) {
				next.delete(filter);
			} else {
				next.add(filter);
			}
			return next;
		});
	};

	// Filter workflows by group (for grouped design)
	const filteredByGroup = useMemo(() => {
		if (selectedGroup === "all") return MOCK_SCHEDULED_WORKFLOWS;
		return MOCK_SCHEDULED_WORKFLOWS.filter(
			(w) => WORKFLOW_GROUP_MAP[w.id] === selectedGroup,
		);
	}, [selectedGroup]);

	// Filter workflows by status (for original design)
	const filteredByStatus = useMemo(() => {
		if (statusFilter === "all") return MOCK_SCHEDULED_WORKFLOWS;
		return MOCK_SCHEDULED_WORKFLOWS.filter((w) => w.status === statusFilter);
	}, [statusFilter]);

	// Use appropriate filter based on design mode
	const filteredWorkflows =
		designMode === "original" ? filteredByStatus : filteredByGroup;

	// Group workflows by category for grouped view
	const groupedWorkflows = useMemo(() => {
		const groups: Record<string, ScheduledWorkflow[]> = {};
		for (const workflow of filteredWorkflows) {
			const groupId = WORKFLOW_GROUP_MAP[workflow.id] || "other";
			const groupName =
				WORKFLOW_GROUPS.find((g) => g.id === groupId)?.name || "Other";
			if (!groups[groupName]) groups[groupName] = [];
			groups[groupName].push(workflow);
		}
		return groups;
	}, [filteredWorkflows]);

	// Get selected workflow detail
	const selectedDetail = useMemo(() => {
		if (!selectedWorkflow) return null;
		return getMockWorkflowDetail(selectedWorkflow);
	}, [selectedWorkflow]);

	// Stats
	const stats = useMemo(() => {
		const healthy = filteredWorkflows.filter(
			(w) => calculateSuccessRate(w) >= 90,
		).length;
		const warning = filteredWorkflows.filter((w) => {
			const rate = calculateSuccessRate(w);
			return rate >= 70 && rate < 90;
		}).length;
		const critical = filteredWorkflows.filter(
			(w) => calculateSuccessRate(w) < 70,
		).length;
		return { healthy, warning, critical, total: filteredWorkflows.length };
	}, [filteredWorkflows]);

	// Sort workflows for original design
	const sortedWorkflows = useMemo(() => {
		return [...filteredByStatus].sort((a, b) => {
			if (a.status !== b.status) return a.status === "enabled" ? -1 : 1;
			return calculateSuccessRate(a) - calculateSuccessRate(b);
		});
	}, [filteredByStatus]);

	// Aggregate stats for original design header
	const aggregateStats = useMemo(() => {
		const workflows = MOCK_SCHEDULED_WORKFLOWS;
		const totalRuns = workflows.reduce((sum, w) => sum + w.totalRuns, 0);
		const totalSuccess = workflows.reduce((sum, w) => sum + w.successCount, 0);
		const overallSuccessRate =
			totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 100;
		const enabled = workflows.filter((w) => w.status === "enabled").length;
		const disabled = workflows.filter((w) => w.status === "disabled").length;
		return {
			totalRuns,
			overallSuccessRate,
			enabled,
			disabled,
			total: workflows.length,
		};
	}, []);

	// Filter workflows for kanban based on active filters
	const kanbanFilteredWorkflows = useMemo(() => {
		let workflows = MOCK_SCHEDULED_WORKFLOWS;

		// Filter by future scheduled time (nextRunTime)
		if (timeFilter !== "all") {
			const now = new Date();
			const daysAhead = timeFilter === "7days" ? 7 : 15;
			const cutoffDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
			workflows = workflows.filter((w) => {
				if (!w.nextRunTime) return true; // Include if no next run time
				const nextRun = new Date(w.nextRunTime);
				return nextRun <= cutoffDate;
			});
		}

		// Filter by status
		if (kanbanFilters.size > 0) {
			workflows = workflows.filter((w) => {
				const status = getWorkflowFilterStatus(w);
				return kanbanFilters.has(status);
			});
		}

		return workflows;
	}, [kanbanFilters, timeFilter]);

	// Group workflows by tag for Linear table/board view
	const workflowsByTag = useMemo(() => {
		const groups: Record<string, ScheduledWorkflow[]> = {};
		for (const workflow of kanbanFilteredWorkflows) {
			const groupId = WORKFLOW_GROUP_MAP[workflow.id] || "other";
			if (!groups[groupId]) groups[groupId] = [];
			groups[groupId].push(workflow);
		}
		return groups;
	}, [kanbanFilteredWorkflows]);

	// Filter groups by health status
	const filteredGroups = useMemo(() => {
		return WORKFLOW_GROUPS.filter((g) => {
			if (g.id === "all") return false;
			const workflows = workflowsByTag[g.id] || [];
			if (workflows.length === 0) return false;

			if (groupHealthFilter === "all") return true;

			// Inline health rate calculation
			const totalRuns = workflows.reduce((sum, w) => sum + w.totalRuns, 0);
			const totalSuccess = workflows.reduce(
				(sum, w) => sum + w.successCount,
				0,
			);
			const healthRate =
				totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 100;
			if (groupHealthFilter === "healthy") return healthRate >= 90;
			if (groupHealthFilter === "needs-attention") return healthRate < 90;
			return true;
		});
	}, [workflowsByTag, groupHealthFilter]);

	const toggleGroup = (groupId: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(groupId)) {
				next.delete(groupId);
			} else {
				next.add(groupId);
			}
			return next;
		});
	};

	const Layout = isActionsNav ? ActionsLayout : RitaLayout;
	const layoutProps = isActionsNav ? {} : { activePage: "scheduler" as const };

	return (
		<Layout {...layoutProps}>
			<div className={isActionsNav ? "[&_*]:!font-sans [&_h1]:!font-sans [&_h2]:!font-sans [&_h3]:!font-sans [&_h4]:!font-sans" : ""}>

			{/* DESIGN A: Original - Stats Header + Card Grid */}
			{designMode === "original" && (
				<>
					<MainHeader
						title="Scheduler Dashboard"
						description={
							<span>
								Monitoring{" "}
								<span className="font-semibold">{aggregateStats.total}</span>{" "}
								scheduled workflows
								{" \u2022 "}
								<span className="font-semibold">{aggregateStats.enabled}</span>{" "}
								enabled,{" "}
								<span className="font-semibold">{aggregateStats.disabled}</span>{" "}
								disabled
							</span>
						}
						stats={
							<StatGroup>
								<StatCard
									value={aggregateStats.totalRuns.toLocaleString()}
									label="Total Executions"
								/>
								<StatCard
									value={`${aggregateStats.overallSuccessRate}%`}
									label="Success Rate"
								/>
								<StatCard
									value={stats.healthy.toString()}
									label="Healthy Workflows"
								/>
								<StatCard
									value={stats.critical.toString()}
									label="Needs Attention"
								/>
							</StatGroup>
						}
					/>

					{/* Filter Bar */}
					<div className="px-6 py-4 border-b bg-background flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							Showing {filteredByStatus.length} workflow
							{filteredByStatus.length !== 1 ? "s" : ""}
						</span>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="gap-2">
									<Filter className="size-4" />
									{statusFilter === "all"
										? "All Status"
										: statusFilter === "enabled"
											? "Enabled"
											: "Disabled"}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setStatusFilter("all")}>
									All Status
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setStatusFilter("enabled")}>
									Enabled Only
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setStatusFilter("disabled")}>
									Disabled Only
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Workflow Cards Grid */}
					<div className="p-6">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{sortedWorkflows.map((workflow) => (
								<WorkflowCard key={workflow.id} workflow={workflow} />
							))}
						</div>
					</div>
				</>
			)}

			{/* DESIGN B: Grouped - Sidebar + Columns + Sheet */}
			{designMode === "grouped" && (
				<div className="flex h-[calc(100vh-135px)]">
					{/* Left Sidebar - Groups */}
					<div className="w-56 border-r bg-muted/30 flex-shrink-0">
						<div className="p-4 border-b">
							<h2 className="font-medium text-sm">Groups</h2>
						</div>
						<ScrollArea className="h-[calc(100%-57px)]">
							<div className="p-2">
								{WORKFLOW_GROUPS.map((group) => (
									<button
										key={group.id}
										className={cn(
											"w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
											"hover:bg-muted",
											selectedGroup === group.id && "bg-muted font-medium",
										)}
										onClick={() => setSelectedGroup(group.id)}
									>
										<div className="flex items-center justify-between">
											<span>{group.name}</span>
											<span className="text-xs text-muted-foreground">
												{group.count}
											</span>
										</div>
									</button>
								))}
							</div>
						</ScrollArea>
					</div>

					{/* Main Content */}
					<div className="flex-1 flex flex-col min-w-0">
						{/* Header */}
						<div className="px-6 py-4 border-b flex items-center justify-between">
							<div>
								<h1 className="text-lg font-medium">Scheduler</h1>
								<p className="text-sm text-muted-foreground">
									{stats.total} workflows &middot;{" "}
									<span className="text-emerald-600">
										{stats.healthy} healthy
									</span>
									{stats.warning > 0 && (
										<>
											,{" "}
											<span className="text-amber-600">
												{stats.warning} warning
											</span>
										</>
									)}
									{stats.critical > 0 && (
										<>
											,{" "}
											<span className="text-red-600">
												{stats.critical} critical
											</span>
										</>
									)}
								</p>
							</div>

							{/* Layout Switcher */}
							<div className="flex items-center gap-1 bg-muted rounded-lg p-1">
								<Button
									variant={layoutMode === "grid" ? "secondary" : "ghost"}
									size="sm"
									className="h-7 w-7 p-0"
									onClick={() => setLayoutMode("grid")}
								>
									<LayoutGrid className="size-4" />
								</Button>
								<Button
									variant={layoutMode === "grouped" ? "secondary" : "ghost"}
									size="sm"
									className="h-7 w-7 p-0"
									onClick={() => setLayoutMode("grouped")}
								>
									<Columns3 className="size-4" />
								</Button>
								<Button
									variant={layoutMode === "list" ? "secondary" : "ghost"}
									size="sm"
									className="h-7 w-7 p-0"
									onClick={() => setLayoutMode("list")}
								>
									<List className="size-4" />
								</Button>
							</div>
						</div>

						{/* Content Area */}
						<ScrollArea className="flex-1">
							<div className="p-6">
								{/* Grid View */}
								{layoutMode === "grid" && (
									<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
										{filteredWorkflows.map((workflow) => (
											<WorkflowTile
												key={workflow.id}
												workflow={workflow}
												onClick={() => setSelectedWorkflow(workflow.id)}
												isSelected={selectedWorkflow === workflow.id}
											/>
										))}
									</div>
								)}

								{/* Grouped View (BMC-style columns) */}
								{layoutMode === "grouped" && (
									<div className="flex gap-4 overflow-x-auto pb-4">
										{Object.entries(groupedWorkflows).map(
											([groupName, workflows]) => (
												<div key={groupName} className="flex-shrink-0 w-64">
													<div className="sticky top-0 bg-background pb-2 mb-2 border-b">
														<h3 className="text-sm font-medium">{groupName}</h3>
														<p className="text-xs text-muted-foreground">
															{workflows.length} workflows
														</p>
													</div>
													<div className="space-y-2">
														{workflows.map((workflow) => (
															<WorkflowTile
																key={workflow.id}
																workflow={workflow}
																onClick={() => setSelectedWorkflow(workflow.id)}
																isSelected={selectedWorkflow === workflow.id}
															/>
														))}
													</div>
												</div>
											),
										)}
									</div>
								)}

								{/* List View */}
								{layoutMode === "list" && (
									<div className="border rounded-lg overflow-hidden">
										<div className="flex items-center gap-4 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
											<div className="w-2" />
											<div className="flex-1">Name</div>
											<div className="w-20 text-right">Last Run</div>
											<div className="w-20 text-right">Next Run</div>
											<div className="w-12 text-right">Health</div>
										</div>
										{filteredWorkflows.map((workflow) => (
											<WorkflowRow
												key={workflow.id}
												workflow={workflow}
												onClick={() => setSelectedWorkflow(workflow.id)}
												isSelected={selectedWorkflow === workflow.id}
											/>
										))}
									</div>
								)}
							</div>
						</ScrollArea>
					</div>

					{/* Detail Sheet */}
					<Sheet
						open={!!selectedWorkflow}
						onOpenChange={(open) => !open && setSelectedWorkflow(null)}
					>
						<SheetContent className="w-full sm:!w-[640px] sm:!max-w-[640px] p-0 overflow-auto">
							{selectedDetail && (
								<WorkflowDetailPanel
									detail={selectedDetail}
									onClose={() => setSelectedWorkflow(null)}
								/>
							)}
						</SheetContent>
					</Sheet>
				</div>
			)}

			{/* DESIGN C: Linear Style - Table or Board */}
			{designMode === "linear" && (
				<div className="flex flex-col h-[calc(100vh-135px)] bg-background">
					{/* Header */}
					<div className="flex items-center justify-between px-4 py-3 border-b">
						<div className="flex items-center gap-3">
							<h1 className="text-sm font-medium">Scheduled Workflows</h1>
							<span className="text-xs text-muted-foreground">
								{MOCK_SCHEDULED_WORKFLOWS.length}
							</span>
						</div>
						<div className="flex items-center gap-2">
							{/* View Switcher */}
							<div className="flex items-center gap-1 bg-muted rounded p-0.5">
								<Button
									variant="ghost"
									size="sm"
									className={cn(
										"h-6 w-6 p-0",
										linearLayoutMode === "table"
											? "bg-background shadow-sm"
											: "text-muted-foreground hover:text-foreground hover:bg-transparent",
									)}
									onClick={() => setLinearLayoutMode("table")}
								>
									<List className="size-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className={cn(
										"h-6 w-6 p-0",
										linearLayoutMode === "board"
											? "bg-background shadow-sm"
											: "text-muted-foreground hover:text-foreground hover:bg-transparent",
									)}
									onClick={() => setLinearLayoutMode("board")}
								>
									<Kanban className="size-3.5" />
								</Button>
							</div>
						</div>
					</div>

					{/* Table View */}
					{linearLayoutMode === "table" && (
						<ScrollArea className="flex-1">
							<div className="divide-y divide-border">
								{WORKFLOW_GROUPS.filter((g) => g.id !== "all").map((group) => {
									const workflows = workflowsByTag[group.id] || [];
									if (workflows.length === 0) return null;
									const isExpanded = expandedGroups.has(group.id);

									return (
										<div key={group.id}>
											{/* Group Header */}
											<button
												className="flex items-center gap-2 w-full px-4 py-2 hover:bg-muted/50 text-left"
												onClick={() => toggleGroup(group.id)}
											>
												{isExpanded ? (
													<ChevronDown className="size-3 text-muted-foreground" />
												) : (
													<ChevronRight className="size-3 text-muted-foreground" />
												)}
												<span className="text-xs font-medium text-foreground">
													{group.name}
												</span>
												<span className="text-xs text-muted-foreground">
													{workflows.length}
												</span>
											</button>

											{/* Group Items */}
											{isExpanded && (
												<div className="divide-y divide-border/50">
													{workflows.map((workflow) => (
														<LinearTableRow
															key={workflow.id}
															workflow={workflow}
															onClick={() => setSelectedWorkflow(workflow.id)}
															isSelected={selectedWorkflow === workflow.id}
														/>
													))}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</ScrollArea>
					)}

					{/* Board View - Columns by Tag/Group */}
					{linearLayoutMode === "board" && (
						<div className="flex-1 overflow-x-auto p-4">
							<div className="flex gap-6 h-full">
								{WORKFLOW_GROUPS.filter((g) => g.id !== "all").map((group) => {
									const workflows = workflowsByTag[group.id] || [];
									if (workflows.length === 0) return null;

									return (
										<div
											key={group.id}
											className="flex-shrink-0 w-64 flex flex-col"
										>
											{/* Column Header */}
											<div className="flex items-center gap-2 px-1 py-2 mb-2">
												<span className="text-sm font-medium truncate">
													{group.name}
												</span>
												<span className="text-xs text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
													{workflows.length}
												</span>
											</div>

											{/* Column Cards */}
											<div className="flex-1 space-y-2">
												{workflows.map((workflow) => (
													<LinearBoardCard
														key={workflow.id}
														workflow={workflow}
														onClick={() => setSelectedWorkflow(workflow.id)}
														isSelected={selectedWorkflow === workflow.id}
													/>
												))}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Detail Sheet */}
					<Sheet
						open={!!selectedWorkflow}
						onOpenChange={(open) => !open && setSelectedWorkflow(null)}
					>
						<SheetContent className="w-full sm:!w-[640px] sm:!max-w-[640px] p-0 overflow-auto">
							{selectedDetail && (
								<WorkflowDetailPanel
									detail={selectedDetail}
									onClose={() => setSelectedWorkflow(null)}
								/>
							)}
						</SheetContent>
					</Sheet>
				</div>
			)}

			{/* DESIGN D: Figma Style - Stats Header + Group Cards Grid */}
			{designMode === "figma" && (
				<div className="flex flex-col h-[calc(100vh-135px)] bg-background overflow-auto">
					{/* Stats Header */}
					<MainHeader
						title="Scheduler Dashboard"
						description={
							<span>
								Monitoring{" "}
								<span className="font-semibold">{aggregateStats.total}</span>{" "}
								scheduled workflows
								{" \u2022 "}
								<span className="font-semibold">{aggregateStats.enabled}</span>{" "}
								enabled,{" "}
								<span className="font-semibold">{aggregateStats.disabled}</span>{" "}
								disabled
							</span>
						}
						stats={
							<StatGroup>
								<StatCard
									value={aggregateStats.totalRuns.toLocaleString()}
									label="Total Executions"
								/>
								<StatCard
									value={`${aggregateStats.overallSuccessRate}%`}
									label="Success Rate"
								/>
								<StatCard
									value={stats.healthy.toString()}
									label="Healthy Workflows"
								/>
								<StatCard
									value={stats.critical.toString()}
									label="Needs Attention"
								/>
							</StatGroup>
						}
					/>

					{/* Section Header */}
					<div className="px-6 py-4">
						<div className="flex items-start justify-between">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-medium">
										Scheduled workflow groups
									</h2>
									<Badge variant="secondary" className="text-xs">
										{filteredGroups.length}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground mt-1">
									Based on the last 7 days
								</p>
							</div>

							<div className="flex items-center gap-2">
								{/* View Mode Toggle */}
								<div className="flex items-center gap-1 border rounded-md p-0.5">
									<Button
										variant={figmaViewMode === "grid" ? "secondary" : "ghost"}
										size="sm"
										className="h-7 w-7 p-0"
										onClick={() => setFigmaViewMode("grid")}
									>
										<LayoutGrid className="size-4" />
									</Button>
									<Button
										variant={figmaViewMode === "list" ? "secondary" : "ghost"}
										size="sm"
										className="h-7 w-7 p-0"
										onClick={() => setFigmaViewMode("list")}
									>
										<List className="size-4" />
									</Button>
								</div>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm" className="gap-2 h-8">
											{groupHealthFilter === "all"
												? "All Groups"
												: groupHealthFilter === "healthy"
													? "Healthy"
													: "Needs Attention"}
											<ChevronDown className="size-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() => setGroupHealthFilter("all")}
										>
											All Groups
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setGroupHealthFilter("healthy")}
										>
											Healthy ({">"}90%)
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setGroupHealthFilter("needs-attention")}
										>
											Needs Attention ({"<"}90%)
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<Button variant="outline" size="icon" className="size-8">
									<RefreshCw className="size-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Group Cards Grid View */}
					{figmaViewMode === "grid" && (
						<div className="px-6 pb-6 flex-1">
							<div className="grid grid-cols-3 gap-4">
								{filteredGroups.map((group) => {
									const workflows = workflowsByTag[group.id] || [];
									return (
										<FigmaGroupCard
											key={group.id}
											group={group}
											workflows={workflows}
											onClick={() => navigate(`/scheduler/group/${group.id}`)}
										/>
									);
								})}
							</div>
						</div>
					)}

					{/* Group List View */}
					{figmaViewMode === "list" && (
						<div className="px-6 pb-6 flex-1">
							<div className="border rounded-sm overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Group Name</TableHead>
											<TableHead className="w-[100px] text-center">
												Workflows
											</TableHead>
											<TableHead className="w-[120px] text-center">
												Success Rate
											</TableHead>
											<TableHead className="w-[100px] text-center">
												Failed
											</TableHead>
											<TableHead className="w-[120px] text-center">
												Total Runs
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredGroups.map((group) => {
											const workflows = workflowsByTag[group.id] || [];
											const totalRuns = workflows.reduce(
												(sum, w) => sum + w.totalRuns,
												0,
											);
											const totalSuccess = workflows.reduce(
												(sum, w) => sum + w.successCount,
												0,
											);
											const totalFailure = workflows.reduce(
												(sum, w) => sum + w.failureCount,
												0,
											);
											const successRate =
												totalRuns > 0
													? Math.round((totalSuccess / totalRuns) * 100)
													: 100;

											return (
												<TableRow
													key={group.id}
													className="cursor-pointer hover:bg-muted/50"
													onClick={() =>
														navigate(`/scheduler/group/${group.id}`)
													}
												>
													<TableCell className="font-medium">
														{group.name}
													</TableCell>
													<TableCell className="text-center">
														{workflows.length}
													</TableCell>
													<TableCell className="text-center">
														<span
															className={cn(
																"font-medium",
																successRate >= 90
																	? "text-teal-600"
																	: "text-red-500",
															)}
														>
															{successRate}%
														</span>
													</TableCell>
													<TableCell className="text-center text-red-500">
														{totalFailure.toLocaleString()}
													</TableCell>
													<TableCell className="text-center text-muted-foreground">
														{totalRuns.toLocaleString()}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
				</div>
			)}

			{/* DESIGN E: Kanban Workflows - Board view by group */}
			{designMode === "kanban" && (
				<div className="flex flex-col flex-1 min-h-0 bg-background">
					{/* Workflow Tabs - right after blue header */}
					<div className="px-4 pt-3 border-b border-[#d1d5db] overflow-x-auto">
						<div className="flex gap-1 min-w-max">
							<button className="flex items-center gap-1 p-1 text-[11px] border border-b-0 rounded-t-[6px] bg-white text-[#003057] border-[#d1d5db]">
								<span>Open Incidents (11)</span>
								<X className="size-4 text-[#003057]/60 hover:text-[#003057]" />
							</button>
							<button className="flex items-center gap-1 p-1 text-[11px] border border-b-0 rounded-t-[6px] bg-white text-[#003057] border-[#d1d5db]">
								<span>Running workflows (7)</span>
								<X className="size-4 text-[#003057]/60 hover:text-[#003057]" />
							</button>
							<button className="flex items-center gap-1 p-1 text-[11px] border border-b-0 rounded-t-[6px] bg-[#1B416A] text-white border-[#265a93]">
								<span>Scheduled workflows</span>
								<X className="size-4 text-white/60 hover:text-white" />
							</button>
						</div>
					</div>

					{/* Metric Cards */}
					<div className="px-4 md:px-6 pt-4 pb-2 overflow-x-auto">
						<StatGroup>
							<StatCard
								value={aggregateStats.totalRuns.toLocaleString()}
								label="Total Executions"
							/>
							<StatCard
								value={`${aggregateStats.overallSuccessRate}%`}
								label="Success Rate"
							/>
							<StatCard
								value={stats.healthy.toString()}
								label="Healthy Workflows"
							/>
							<StatCard
								value={stats.critical.toString()}
								label="Needs Attention"
							/>
						</StatGroup>
					</div>

					{/* Section Header */}
					<div className="px-4 md:px-6 py-4">
						<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
							<div>
								<div className="flex items-center gap-2">
									<h2 className="text-base font-medium">Scheduled workflows</h2>
									<Badge variant="secondary" className="text-xs">
										{MOCK_SCHEDULED_WORKFLOWS.length}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground mt-1">
									{timeFilter === "7days" ? "Scheduled for the next 7 days" : timeFilter === "15days" ? "Scheduled for the next 15 days" : "All scheduled workflows"}
								</p>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm" className="gap-2 h-8">
											{timeFilter === "7days" ? "Next 7 days" : timeFilter === "15days" ? "Next 15 days" : "All scheduled"}
											<ChevronDown className="size-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => setTimeFilter("7days")}>
											Next 7 days
											{timeFilter === "7days" && <CheckCircle2 className="size-3 ml-auto text-primary" />}
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => setTimeFilter("15days")}>
											Next 15 days
											{timeFilter === "15days" && <CheckCircle2 className="size-3 ml-auto text-primary" />}
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => setTimeFilter("all")}>
											All scheduled
											{timeFilter === "all" && <CheckCircle2 className="size-3 ml-auto text-primary" />}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								{/* Display dropdown */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm" className="gap-2 h-8">
											{kanbanDisplay === "kanban" ? (
												<Kanban className="size-3" />
											) : (
												<List className="size-3" />
											)}
											{kanbanDisplay === "kanban" ? "Board" : "List"}
											<ChevronDown className="size-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() => setKanbanDisplay("kanban")}
											className="gap-2"
										>
											<Kanban className="size-4" />
											Board view
											{kanbanDisplay === "kanban" && (
												<CheckCircle2 className="size-3 ml-auto text-primary" />
											)}
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setKanbanDisplay("list")}
											className="gap-2"
										>
											<List className="size-4" />
											List view
											{kanbanDisplay === "list" && (
												<CheckCircle2 className="size-3 ml-auto text-primary" />
											)}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								{/* Group by dropdown */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm" className="gap-2 h-8">
											Group by:{" "}
											<span className="text-primary">
												{kanbanGroupBy === "none" ? "None" : "Tags"}
											</span>
											<ChevronDown className="size-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
											GROUP BY
										</div>
										<DropdownMenuItem
											onClick={() => setKanbanGroupBy("none")}
											className="gap-2"
										>
											<LayoutGrid className="size-4" />
											None
											{kanbanGroupBy === "none" && (
												<CheckCircle2 className="size-3 ml-auto text-primary" />
											)}
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => {
												setKanbanGroupBy("tags");
												setKanbanDisplay("kanban");
											}}
											className="gap-2"
										>
											<Columns3 className="size-4" />
											Tags
											{kanbanGroupBy === "tags" && (
												<CheckCircle2 className="size-3 ml-auto text-primary" />
											)}
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm" className="gap-2 h-8">
											<Filter className="size-3" />
											Filter
											<ChevronDown className="size-3" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-44 p-1">
										<DropdownMenuItem
											onSelect={() => toggleKanbanFilter("failed")}
											className="gap-2 cursor-pointer"
										>
											<div
												className={cn(
													"size-4 rounded border flex items-center justify-center",
													kanbanFilters.has("failed")
														? "bg-primary border-primary"
														: "border-gray-300 bg-white",
												)}
											>
												{kanbanFilters.has("failed") && (
													<CheckCircle2 className="size-3 text-white" />
												)}
											</div>
											<FailedIcon className="size-4" />
											Failed
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => toggleKanbanFilter("executing")}
											className="gap-2 cursor-pointer"
										>
											<div
												className={cn(
													"size-4 rounded border flex items-center justify-center",
													kanbanFilters.has("executing")
														? "bg-primary border-primary"
														: "border-gray-300 bg-white",
												)}
											>
												{kanbanFilters.has("executing") && (
													<CheckCircle2 className="size-3 text-white" />
												)}
											</div>
											<ExecutingIcon className="size-4" />
											Executing
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => toggleKanbanFilter("scheduled")}
											className="gap-2 cursor-pointer"
										>
											<div
												className={cn(
													"size-4 rounded border flex items-center justify-center",
													kanbanFilters.has("scheduled")
														? "bg-primary border-primary"
														: "border-gray-300 bg-white",
												)}
											>
												{kanbanFilters.has("scheduled") && (
													<CheckCircle2 className="size-3 text-white" />
												)}
											</div>
											<ScheduledIcon className="size-4" />
											Scheduled
										</DropdownMenuItem>
										<DropdownMenuItem
											onSelect={() => toggleKanbanFilter("healthy")}
											className="gap-2 cursor-pointer"
										>
											<div
												className={cn(
													"size-4 rounded border flex items-center justify-center",
													kanbanFilters.has("healthy")
														? "bg-primary border-primary"
														: "border-gray-300 bg-white",
												)}
											>
												{kanbanFilters.has("healthy") && (
													<CheckCircle2 className="size-3 text-white" />
												)}
											</div>
											<SuccessIcon className="size-4" />
											Healthy
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<Button variant="outline" size="icon" className="size-8">
									<RefreshCw className="size-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Active filter chips - above columns */}
					{kanbanFilters.size > 0 && (
						<div className="flex flex-wrap items-center gap-2 px-4 md:px-6 pb-3">
							{kanbanFilters.has("failed") && (
								<button
									onClick={() => toggleKanbanFilter("failed")}
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
								>
									<FailedIcon className="size-4" />
									Failed
									<X className="size-3" />
								</button>
							)}
							{kanbanFilters.has("scheduled") && (
								<button
									onClick={() => toggleKanbanFilter("scheduled")}
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-muted border border-border text-foreground hover:bg-muted/80"
								>
									<ScheduledIcon className="size-4" />
									Not Started
									<X className="size-3" />
								</button>
							)}
							{kanbanFilters.has("executing") && (
								<button
									onClick={() => toggleKanbanFilter("executing")}
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
								>
									<ExecutingIcon className="size-4" />
									Executing
									<X className="size-3" />
								</button>
							)}
							{kanbanFilters.has("healthy") && (
								<button
									onClick={() => toggleKanbanFilter("healthy")}
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
								>
									<SuccessIcon className="size-4" />
									Healthy
									<X className="size-3" />
								</button>
							)}
						</div>
					)}

					{/* Workflow Board */}
					<div className="flex-1 overflow-x-auto px-4 md:px-6 pb-6">
						{kanbanGroupBy === "none" && kanbanDisplay === "list" ? (
							/* Ungrouped: Table list view matching Figma design */
							<div className="border rounded-sm overflow-hidden">
								{/* Header row - hidden on mobile */}
								<div className="hidden md:flex items-center gap-6 px-3 py-3 bg-white border-b">
									<div className="flex-1 flex items-center gap-2">
										<span className="text-base font-normal text-foreground">Name</span>
									</div>
									<div className="w-[200px] flex items-center gap-1 shrink-0">
										<span className="text-base font-normal text-foreground">Last run</span>
										<ChevronDown className="size-4 text-muted-foreground" />
									</div>
									<div className="w-[200px] shrink-0">
										<span className="text-base font-normal text-foreground">Next run</span>
									</div>
									<div className="w-[100px] text-right shrink-0">
										<span className="text-base font-normal text-foreground">Status</span>
									</div>
								</div>
								{/* Data rows */}
								<div className="divide-y">
									{kanbanFilteredWorkflows.map((workflow) => {
										const rate = calculateSuccessRate(workflow);
										const isDisabled = workflow.status === "disabled";
										const isFailed = workflow.status === "enabled" && rate < 70;
										const isExecuting = EXECUTING_WORKFLOW_IDS.includes(workflow.id);

										return (
											<div
												key={workflow.id}
												role="button"
												tabIndex={0}
												onClick={() => setSelectedWorkflow(workflow.id)}
												onKeyDown={(e) =>
													e.key === "Enter" && setSelectedWorkflow(workflow.id)
												}
												className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 px-3 py-3 hover:bg-muted/30 cursor-pointer bg-white"
											>
												{/* Status icon + Name */}
												<div className="flex-1 flex items-center gap-2 min-w-0">
													{isDisabled ? (
														<ScheduledIcon className="size-5 shrink-0" />
													) : isFailed ? (
														<FailedIcon className="size-5 shrink-0" />
													) : isExecuting ? (
														<ExecutingIcon className="size-5 shrink-0" />
													) : (
														<SuccessIcon className="size-5 shrink-0" />
													)}
													<span
														className={cn(
															"text-base font-normal truncate",
															isDisabled && "text-muted-foreground",
														)}
													>
														{workflow.name}
													</span>
												</div>

												{/* Mobile: condensed info row */}
												<div className="flex md:hidden items-center justify-between pl-7 text-sm text-muted-foreground">
													<span>Next: {formatDate(workflow.nextRunTime)}</span>
													<span className={cn("tabular-nums", isDisabled && "text-muted-foreground")}>
														{rate}%
													</span>
												</div>

												{/* Desktop: Last run */}
												<div className="hidden md:block w-[200px] text-base font-normal text-foreground shrink-0">
													{isDisabled ? "--" : (workflow.lastRunTime ? formatDate(workflow.lastRunTime) : "--")}
												</div>

												{/* Desktop: Next run */}
												<div className="hidden md:block w-[200px] text-base font-normal text-foreground shrink-0">
													{formatDate(workflow.nextRunTime)}
												</div>

												{/* Desktop: Status with gauge */}
												<div className="hidden md:flex w-[100px] items-center gap-1 justify-end shrink-0">
													<span
														className={cn(
															"text-sm tabular-nums",
															isDisabled && "text-muted-foreground",
														)}
													>
														{rate}%
													</span>
													<div className="flex items-end gap-px h-[10px]">
														{workflow.recentExecutions
															.slice(-8)
															.map((status, i) => (
																<div
																	key={i}
																	className={cn(
																		"w-[3px] rounded-sm h-full",
																		isDisabled
																			? "bg-muted-foreground/40"
																			: status === "success"
																				? "bg-emerald-500"
																				: "bg-red-400",
																	)}
																/>
															))}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						) : kanbanGroupBy === "none" && kanbanDisplay === "kanban" ? (
							/* Ungrouped: Board view by status */
							<div className="flex gap-3 md:gap-4 h-full pb-2" style={{ minWidth: "max-content" }}>
								{/* Success Column */}
								<div className="flex flex-col w-[260px] md:w-[300px] shrink-0">
									<div className="flex items-center gap-2 px-2 py-2 bg-emerald-50 rounded-t-sm border border-b-0 border-emerald-200">
										<SuccessIcon className="size-5" />
										<span className="text-sm font-medium text-emerald-700">Success</span>
										<Badge variant="secondary" className="text-xs ml-auto">
											{kanbanFilteredWorkflows.filter(w => w.status === "enabled" && calculateSuccessRate(w) >= 70).length}
										</Badge>
									</div>
									<div className="flex-1 p-2 bg-emerald-50/50 rounded-b-sm border border-t-0 border-emerald-200 space-y-1.5 overflow-y-auto max-h-[50vh] md:max-h-[calc(100vh-400px)]">
										{kanbanFilteredWorkflows
											.filter(w => w.status === "enabled" && calculateSuccessRate(w) >= 70)
											.map((workflow) => (
												<KanbanWorkflowCard
													key={workflow.id}
													workflow={workflow}
													onClick={() => setSelectedWorkflow(workflow.id)}
													isSelected={selectedWorkflow === workflow.id}
												/>
											))}
									</div>
								</div>
								{/* Failed Column */}
								<div className="flex flex-col w-[260px] md:w-[300px] shrink-0">
									<div className="flex items-center gap-2 px-2 py-2 bg-red-50 rounded-t-sm border border-b-0 border-red-200">
										<FailedIcon className="size-5" />
										<span className="text-sm font-medium text-red-700">Failed</span>
										<Badge variant="secondary" className="text-xs ml-auto">
											{kanbanFilteredWorkflows.filter(w => w.status === "enabled" && calculateSuccessRate(w) < 70).length}
										</Badge>
									</div>
									<div className="flex-1 p-2 bg-red-50/50 rounded-b-sm border border-t-0 border-red-200 space-y-1.5 overflow-y-auto max-h-[50vh] md:max-h-[calc(100vh-400px)]">
										{kanbanFilteredWorkflows
											.filter(w => w.status === "enabled" && calculateSuccessRate(w) < 70)
											.map((workflow) => (
												<KanbanWorkflowCard
													key={workflow.id}
													workflow={workflow}
													onClick={() => setSelectedWorkflow(workflow.id)}
													isSelected={selectedWorkflow === workflow.id}
												/>
											))}
									</div>
								</div>
								{/* Scheduled/Paused Column */}
								<div className="flex flex-col w-[260px] md:w-[300px] shrink-0">
									<div className="flex items-center gap-2 px-2 py-2 bg-muted/50 rounded-t-sm border border-b-0">
										<ScheduledIcon className="size-5" />
										<span className="text-sm font-medium text-muted-foreground">Scheduled</span>
										<Badge variant="secondary" className="text-xs ml-auto">
											{kanbanFilteredWorkflows.filter(w => w.status === "disabled").length}
										</Badge>
									</div>
									<div className="flex-1 p-2 bg-muted/30 rounded-b-sm border border-t-0 space-y-1.5 overflow-y-auto max-h-[50vh] md:max-h-[calc(100vh-400px)]">
										{kanbanFilteredWorkflows
											.filter(w => w.status === "disabled")
											.map((workflow) => (
												<KanbanWorkflowCard
													key={workflow.id}
													workflow={workflow}
													onClick={() => setSelectedWorkflow(workflow.id)}
													isSelected={selectedWorkflow === workflow.id}
												/>
											))}
									</div>
								</div>
							</div>
						) : kanbanDisplay === "kanban" ? (
							/* Grouped by tags: Horizontal scroll kanban */
							<div
								className="flex gap-4 h-full pb-2"
								style={{ minWidth: "max-content" }}
							>
								{WORKFLOW_GROUPS.filter((g) => g.id !== "all").map((group) => {
									const workflows = workflowsByTag[group.id] || [];
									if (workflows.length === 0) return null;

									// Calculate group status
									const failedCount = workflows.filter(
										(w) =>
											w.status === "enabled" && calculateSuccessRate(w) < 70,
									).length;
									const executingCount = workflows.filter((w) =>
										EXECUTING_WORKFLOW_IDS.includes(w.id),
									).length;
									const scheduledCount = workflows.filter(
										(w) => w.status === "disabled",
									).length;

									return (
										<div
											key={group.id}
											className="flex flex-col w-[260px] md:w-[300px] shrink-0"
										>
											{/* Column Header */}
											<div className="flex items-center gap-2 px-2 py-2 bg-muted/30 rounded-t-sm border border-b-0">
												<span className="text-sm font-medium truncate flex-1">
													{group.name}
												</span>
												<Badge variant="secondary" className="text-xs shrink-0">
													{workflows.length}
												</Badge>
												{/* Status indicator */}
												{executingCount > 0 ? (
													<span className="inline-flex items-center gap-1 text-xs text-amber-600">
														<Clock className="size-3 animate-pulse" />
														Processing...
													</span>
												) : failedCount > 0 ? (
													<span className="inline-flex items-center gap-1 text-xs text-red-600">
														<FailedIcon className="size-4" />
														{failedCount} failed
													</span>
												) : scheduledCount > 0 &&
													scheduledCount === workflows.length ? (
													<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
														<ScheduledIcon className="size-4" />
														Scheduled
													</span>
												) : null}
											</div>

											{/* Column Cards */}
											<div className="flex-1 p-2 bg-muted/30 rounded-b-sm border border-t-0 space-y-1.5 overflow-y-auto max-h-[50vh] md:max-h-[calc(100vh-320px)]">
												{workflows.map((workflow) => (
													<KanbanWorkflowCard
														key={workflow.id}
														workflow={workflow}
														onClick={() => setSelectedWorkflow(workflow.id)}
														isSelected={selectedWorkflow === workflow.id}
													/>
												))}
											</div>
										</div>
									);
								})}
							</div>
						) : (
							/* Grouped by tags: Accordion list view */
							<div className="space-y-4">
								{WORKFLOW_GROUPS.filter((g) => g.id !== "all").map((group) => {
									const workflows = workflowsByTag[group.id] || [];
									if (workflows.length === 0) return null;

									// Calculate group status
									const failedCount = workflows.filter(
										(w) =>
											w.status === "enabled" && calculateSuccessRate(w) < 70,
									).length;
									const executingCount = workflows.filter((w) =>
										EXECUTING_WORKFLOW_IDS.includes(w.id),
									).length;
									const isExpanded = expandedKanbanGroups.has(group.id);

									return (
										<div
											key={group.id}
											className={cn(
												"border rounded-sm overflow-hidden",
												failedCount > 0 && "border-b-2 border-b-red-400",
											)}
										>
											{/* Accordion Header */}
											<button
												onClick={() => {
													setExpandedKanbanGroups((prev) => {
														const next = new Set(prev);
														if (next.has(group.id)) {
															next.delete(group.id);
														} else {
															next.add(group.id);
														}
														return next;
													});
												}}
												className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
											>
												<ChevronRight
													className={cn(
														"size-4 transition-transform",
														isExpanded && "rotate-90",
													)}
												/>
												<span className="text-sm font-medium">
													{group.name}
												</span>
												<Badge variant="secondary" className="text-xs">
													{workflows.length}
												</Badge>
												{/* Status indicator */}
												{executingCount > 0 && (
													<span className="inline-flex items-center gap-1 text-xs text-amber-600 ml-2">
														<Clock className="size-3 animate-pulse" />
														Processing...
													</span>
												)}
												{failedCount > 0 && (
													<span className="inline-flex items-center gap-1 text-xs text-red-600 ml-auto">
														<FailedIcon className="size-4" />
														{failedCount} failed
													</span>
												)}
											</button>

											{/* Accordion Content */}
											{isExpanded && (
												<div className="divide-y">
													{workflows.map((workflow) => {
														const rate = calculateSuccessRate(workflow);
														const isDisabled = workflow.status === "disabled";
														const isFailed =
															workflow.status === "enabled" && rate < 70;

														return (
															<div
																key={workflow.id}
																role="button"
																tabIndex={0}
																onClick={() => setSelectedWorkflow(workflow.id)}
																onKeyDown={(e) =>
																	e.key === "Enter" &&
																	setSelectedWorkflow(workflow.id)
																}
																className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer"
															>
																{/* Status icon */}
																{isDisabled ? (
																	<ScheduledIcon className="size-5 shrink-0" />
																) : isFailed ? (
																	<FailedIcon className="size-5 shrink-0" />
																) : (
																	<SuccessIcon className="size-5 shrink-0" />
																)}

																{/* Name */}
																<span
																	className={cn(
																		"flex-1 text-sm",
																		isDisabled && "text-muted-foreground",
																	)}
																>
																	{workflow.name}
																</span>

																{/* Last run */}
																<div className="text-xs text-muted-foreground w-48">
																	<span className="text-foreground">
																		Last run:
																	</span>{" "}
																	{formatDate(workflow.lastRunTime)}
																</div>

																{/* Next run */}
																<div className="text-xs text-muted-foreground w-52">
																	<span className="text-foreground">
																		Next run:
																	</span>{" "}
																	{formatDate(workflow.nextRunTime)}
																</div>

																{/* Sparkline + Rate */}
																<div className="flex items-center gap-2 w-24 justify-end">
																	<div className="flex items-end gap-px h-3">
																		{workflow.recentExecutions
																			.slice(-8)
																			.map((status, i) => (
																				<div
																					key={i}
																					className={cn(
																						"w-1 rounded-sm h-full",
																						isDisabled
																							? "bg-muted-foreground/40"
																							: status === "success"
																								? "bg-emerald-500"
																								: "bg-red-400",
																					)}
																				/>
																			))}
																	</div>
																	<span
																		className={cn(
																			"text-sm tabular-nums",
																			isDisabled && "text-muted-foreground",
																		)}
																	>
																		{rate}%
																	</span>
																</div>
															</div>
														);
													})}
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Detail Sheet */}
					<Sheet
						open={!!selectedWorkflow}
						onOpenChange={(open) => !open && setSelectedWorkflow(null)}
					>
						<SheetContent className="w-full sm:!w-[640px] sm:!max-w-[640px] p-0 overflow-auto">
							{selectedDetail && (
								<WorkflowDetailPanel
									detail={selectedDetail}
									onClose={() => setSelectedWorkflow(null)}
								/>
							)}
						</SheetContent>
					</Sheet>
				</div>
			)}
			</div>
		</Layout>
	);
}
