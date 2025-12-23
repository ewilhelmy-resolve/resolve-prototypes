import type { Meta, StoryObj } from "@storybook/react";
import { CheckCircle, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "./StatCard";
import { StatGroup } from "./StatGroup";

const meta: Meta<typeof StatGroup> = {
	component: StatGroup,
	title: "Components/StatGroup",
	tags: ["autodocs"],
	parameters: {
		// layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof StatGroup>;

export const Default: Story = {
	render: () => (
		<StatGroup>
			<StatCard value={42} label="Total Items" />
			<StatCard value={10} label="Active" />
			<StatCard value={2} label="Failed" />
			<StatCard value={30} label="Completed" />
		</StatGroup>
	),
};

export const WithBadges: Story = {
	render: () => (
		<StatGroup>
			<StatCard value={42} label="Total Documents" />
			<StatCard
				value={10}
				label="Processing"
				badge={
					<Badge variant="secondary" className="gap-1">
						<Loader className="h-3 w-3 animate-spin" />
						Active
					</Badge>
				}
			/>
			<StatCard
				value={2}
				label="Failed"
				badge={<Badge variant="destructive">Error</Badge>}
			/>
			<StatCard
				value={30}
				label="Completed"
				badge={
					<Badge className="gap-1">
						<CheckCircle className="h-3 w-3" />
						Done
					</Badge>
				}
			/>
		</StatGroup>
	),
};

export const ThreeColumns: Story = {
	render: () => (
		<StatGroup>
			<StatCard value={1500} label="Total Users" />
			<StatCard value={245} label="Active Today" />
			<StatCard value="99.9%" label="Uptime" />
		</StatGroup>
	),
};

export const KnowledgeBaseStats: Story = {
	render: () => (
		<StatGroup>
			<StatCard value={156} label="Knowledge Articles" />
			<StatCard
				value={12}
				label="Syncing"
				badge={
					<Badge variant="secondary" className="gap-1">
						<Loader className="h-3 w-3 animate-spin" />
						In Progress
					</Badge>
				}
			/>
			<StatCard value={3} label="Connections" />
			<StatCard value="2.4 GB" label="Storage Used" />
		</StatGroup>
	),
};
