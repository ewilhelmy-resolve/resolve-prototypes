import type { Meta, StoryObj } from "@storybook/react";
import { AlertTriangle, CheckCircle, Loader, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "./StatCard";

const meta: Meta<typeof StatCard> = {
	component: StatCard,
	title: "Components/Data Display/Stat Card",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
	decorators: [
		(Story) => (
			<div className="min-w-[300px]">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
	args: {
		value: 42,
		label: "Total Documents",
	},
};

export const WithBadge: Story = {
	args: {
		value: 12,
		label: "Processing",
		badge: (
			<Badge variant="secondary">
				<Loader className="h-3 w-3 animate-spin" />
				Active
			</Badge>
		),
	},
};

export const WithSuccessBadge: Story = {
	args: {
		value: 156,
		label: "Completed",
		badge: (
			<Badge>
				<CheckCircle className="h-3 w-3" />
				Done
			</Badge>
		),
	},
};

export const WithErrorBadge: Story = {
	args: {
		value: 3,
		label: "Failed",
		badge: (
			<Badge variant="destructive">
				<AlertTriangle className="h-3 w-3" />
				Error
			</Badge>
		),
	},
};

export const LargeValue: Story = {
	args: {
		value: "1,234,567",
		label: "Total API Calls",
	},
};

export const StringValue: Story = {
	args: {
		value: "99.9%",
		label: "Uptime",
	},
};

export const WithTrendBadge: Story = {
	args: {
		value: "103k",
		label: "Tickets last 7 days",
		badge: (
			<Badge variant="outline">
				<TrendingUp className="h-3 w-3" />
				+4.5%
			</Badge>
		),
	},
};

export const Loading: Story = {
	args: {
		value: 0,
		label: "Total Documents",
		loading: true,
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="grid grid-cols-2 gap-4 w-full">
			<StatCard value={42} label="Total Documents" />
			<StatCard
				value={12}
				label="Processed"
				badge={
					<Badge variant="outline">
						<TrendingUp className="h-3 w-3" />
						+4.5%
					</Badge>
				}
			/>
			<StatCard
				value={156}
				label="Completed"
				badge={
					<Badge>
						<CheckCircle className="h-3 w-3" />
						Done
					</Badge>
				}
			/>
			<StatCard
				value={3}
				label="Failed"
				badge={
					<Badge variant="destructive">
						<AlertTriangle className="h-3 w-3" />
						Error
					</Badge>
				}
			/>
			<StatCard value={0} label="Loading State" loading={true} />
		</div>
	),
};
