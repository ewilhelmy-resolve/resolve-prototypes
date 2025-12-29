import type { Meta, StoryObj } from "@storybook/react";
import { AlertTriangle, CheckCircle, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "./StatCard";

const meta: Meta<typeof StatCard> = {
	component: StatCard,
	title: "Components/StatCard",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
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
			<Badge variant="secondary" className="gap-1">
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
			<Badge className="gap-1">
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
			<Badge variant="destructive" className="gap-1">
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

export const AllVariants: Story = {
	render: () => (
		<div className="grid grid-cols-2 gap-4 w-full">
			<StatCard value={42} label="Total Documents" />
			<StatCard
				value={12}
				label="Processing"
				badge={
					<Badge variant="secondary" className="gap-1">
						<Loader className="h-3 w-3 animate-spin" />
						Active
					</Badge>
				}
			/>
			<StatCard
				value={156}
				label="Completed"
				badge={
					<Badge className="gap-1">
						<CheckCircle className="h-3 w-3" />
						Done
					</Badge>
				}
			/>
			<StatCard
				value={3}
				label="Failed"
				badge={
					<Badge variant="destructive" className="gap-1">
						<AlertTriangle className="h-3 w-3" />
						Error
					</Badge>
				}
			/>
		</div>
	),
};
