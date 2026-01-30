import type { Meta, StoryObj } from "@storybook/react";
import { ChevronDown } from "lucide-react";
import { Link, MemoryRouter } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { TicketGroupSkeleton } from "./TicketGroupSkeleton";
import { TicketGroupStat } from "./TicketGroupStat";

/**
 * Visual state examples for TicketGroups component.
 * These stories show the different UI states the component can be in.
 */
const meta: Meta = {
	title: "Features/Tickets/Ticket Groups",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Displays ticket groups (clusters) with prev/next button pagination. Supports filtering by period, KB status, and search. This page shows visual states - the actual component fetches data from the API.",
			},
		},
	},
	decorators: [
		(Story) => (
			<MemoryRouter>
				<Story />
			</MemoryRouter>
		),
	],
};

export default meta;
type Story = StoryObj;

// Realistic mock clusters matching ServiceNow data patterns from mock-service
const mockClusters = [
	{
		id: "1",
		name: "Network and Connectivity Issues",
		subcluster_name: "VPN Issues",
		kb_status: "FOUND" as const,
		ticket_count: 156,
	},
	{
		id: "2",
		name: "Office IT Support",
		subcluster_name: null,
		kb_status: "GAP" as const,
		ticket_count: 89,
	},
	{
		id: "3",
		name: "IT Support Issues",
		subcluster_name: null,
		kb_status: "PENDING" as const,
		ticket_count: 234,
	},
	{
		id: "4",
		name: "IT Security Requests",
		subcluster_name: null,
		kb_status: "FOUND" as const,
		ticket_count: 67,
	},
	{
		id: "5",
		name: "Software Issues",
		subcluster_name: "License Expired",
		kb_status: "GAP" as const,
		ticket_count: 45,
	},
	{
		id: "6",
		name: "Video Conferencing Issues",
		subcluster_name: null,
		kb_status: "PENDING" as const,
		ticket_count: 112,
	},
	{
		id: "7",
		name: "Computer Hardware Issues",
		subcluster_name: "Battery",
		kb_status: "FOUND" as const,
		ticket_count: 78,
	},
	{
		id: "8",
		name: "Printer Issues",
		subcluster_name: "Driver Issues",
		kb_status: "GAP" as const,
		ticket_count: 34,
	},
	{
		id: "9",
		name: "User Access Issues",
		subcluster_name: null,
		kb_status: "PENDING" as const,
		ticket_count: 189,
	},
];

// Shared page wrapper
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
	<div className="flex min-h-screen w-full flex-col items-center">
		<div className="flex w-full items-start justify-center py-6">
			<div className="flex w-full flex-col gap-6 px-6">{children}</div>
		</div>
	</div>
);

// Shared header component
const Header = ({
	title = "Ticket Groups",
	count = 0,
	subtitle = "Showing groups from the last 90 days",
}: {
	title?: string;
	count?: number;
	subtitle?: string;
}) => (
	<div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center gap-1.5">
				<h1 className="text-base font-bold text-card-foreground">{title}</h1>
				<Badge variant="outline">{count}</Badge>
			</div>
			<p className="text-sm text-muted-foreground">{subtitle}</p>
		</div>
		<div className="flex flex-wrap gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm">
						Last 90 Days
						<ChevronDown />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Last 30 Days</DropdownMenuItem>
					<DropdownMenuItem>Last 90 Days</DropdownMenuItem>
					<DropdownMenuItem>Last 6 Months</DropdownMenuItem>
					<DropdownMenuItem>Last Year</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm">
						All
						<ChevronDown />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>All</DropdownMenuItem>
					<DropdownMenuItem>Knowledge Found</DropdownMenuItem>
					<DropdownMenuItem>Knowledge Gap</DropdownMenuItem>
					<DropdownMenuItem>Pending</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	</div>
);

// Pagination buttons component
const PaginationButtons = ({
	hasPrev = false,
	hasNext = true,
}: {
	hasPrev?: boolean;
	hasNext?: boolean;
}) => (
	<div className="flex items-center justify-end py-4">
		<div className="flex gap-2">
			<Button variant="outline" size="sm" disabled={!hasPrev}>
				Previous
			</Button>
			<Button variant="outline" size="sm" disabled={!hasNext}>
				Next
			</Button>
		</div>
	</div>
);

/**
 * Default state - shows grid with clusters and pagination buttons
 */
export const WithClusters: Story = {
	render: () => (
		<PageWrapper>
			<Header count={mockClusters.length} />
			<Input placeholder="Search groups..." className="max-w-sm" />
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
				{mockClusters.map((cluster) => (
					<TicketGroupStat
						key={cluster.id}
						id={cluster.id}
						title={
							cluster.subcluster_name
								? `${cluster.name} - ${cluster.subcluster_name}`
								: cluster.name
						}
						count={cluster.ticket_count}
						knowledgeStatus={cluster.kb_status}
					/>
				))}
			</div>
			<PaginationButtons hasPrev={false} hasNext={true} />
		</PageWrapper>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Shows ticket groups with pagination buttons. Use Previous/Next to navigate pages.",
			},
		},
	},
};

/**
 * Middle page - shows both prev and next buttons enabled
 */
export const MiddlePage: Story = {
	render: () => (
		<PageWrapper>
			<Header count={mockClusters.length} subtitle="Page 2 of 4" />
			<Input placeholder="Search groups..." className="max-w-sm" />
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
				{mockClusters.slice(0, 6).map((cluster) => (
					<TicketGroupStat
						key={cluster.id}
						id={cluster.id}
						title={
							cluster.subcluster_name
								? `${cluster.name} - ${cluster.subcluster_name}`
								: cluster.name
						}
						count={cluster.ticket_count}
						knowledgeStatus={cluster.kb_status}
					/>
				))}
			</div>
			<PaginationButtons hasPrev={true} hasNext={true} />
		</PageWrapper>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Shows both Previous and Next buttons enabled when on a middle page.",
			},
		},
	},
};

/**
 * Empty state - no clusters found
 */
export const Empty: Story = {
	render: () => (
		<PageWrapper>
			<Header count={0} />
			<Input placeholder="Search groups..." className="max-w-sm" />
			<div className="flex min-h-[200px] items-center justify-center">
				<p className="text-muted-foreground">No groups available</p>
			</div>
		</PageWrapper>
	),
	parameters: {
		docs: {
			description: {
				story: "Shown when training is complete but no clusters were found.",
			},
		},
	},
};

/**
 * With search - shows filtered results
 */
export const WithSearch: Story = {
	render: () => (
		<PageWrapper>
			<Header count={1} subtitle="Showing groups from the last 90 days" />
			<Input
				placeholder="Search groups..."
				className="max-w-sm"
				defaultValue="Network"
			/>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
				{mockClusters
					.filter((c) => c.name.toLowerCase().includes("network"))
					.map((cluster) => (
						<TicketGroupStat
							key={cluster.id}
							id={cluster.id}
							title={cluster.name}
							count={cluster.ticket_count}
							knowledgeStatus={cluster.kb_status}
						/>
					))}
			</div>
		</PageWrapper>
	),
	parameters: {
		docs: {
			description: {
				story: "Shows filtered results when user searches.",
			},
		},
	},
};

/**
 * Loading state - shows spinner while checking model state
 */
export const Loading: Story = {
	render: () => (
		<div className="flex min-h-[400px] w-full items-center justify-center">
			<Spinner className="size-8 text-muted-foreground" />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: "Initial loading state while checking model training status.",
			},
		},
	},
};

/**
 * No model connected - shows empty state with connect button
 */
export const NoModelConnected: Story = {
	render: () => (
		<PageWrapper>
			<Header count={0} />
			<Input placeholder="Search groups..." className="max-w-sm" disabled />
			<div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">
					No data source connected. Connect a source to see ticket groups.
				</p>
				<Button asChild variant="outline" size="sm">
					<Link to="/settings/connections/itsm">Connect Source</Link>
				</Button>
			</div>
		</PageWrapper>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Shown when no ML model exists - prompts user to connect a data source.",
			},
		},
	},
};

/**
 * Training in progress - shows info banner with skeleton grid
 */
export const TrainingInProgress: Story = {
	render: () => (
		<PageWrapper>
			<Header count={0} />
			<Input placeholder="Search groups..." className="max-w-sm" disabled />
			<div className="flex flex-col gap-6">
				<StatusAlert variant="info" title="Training in Progress">
					<p>
						We're analyzing your tickets to identify patterns. This may take a
						few minutes.
					</p>
				</StatusAlert>
				<div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(6)].map((_, i) => (
						<TicketGroupSkeleton key={i} />
					))}
				</div>
			</div>
		</PageWrapper>
	),
	parameters: {
		docs: {
			description: {
				story: "Shown when ML model is training - displays skeleton cards.",
			},
		},
	},
};

/**
 * Training failed - shows error banner
 */
export const TrainingFailed: Story = {
	render: () => (
		<PageWrapper>
			<Header count={0} />
			<Input placeholder="Search groups..." className="max-w-sm" disabled />
			<div className="flex flex-col gap-6">
				<StatusAlert variant="error" title="Training Failed">
					<p className="mb-3">
						There was an error processing your tickets. Please check your
						connection settings.
					</p>
					<Button asChild variant="outline" size="sm">
						<Link to="/settings/connections/itsm">Go to ITSM Connections</Link>
					</Button>
				</StatusAlert>
				<div className="flex min-h-[200px] items-center justify-center">
					<p className="text-muted-foreground">No groups available</p>
				</div>
			</div>
		</PageWrapper>
	),
	parameters: {
		docs: {
			description: {
				story: "Shown when ML model training fails.",
			},
		},
	},
};
