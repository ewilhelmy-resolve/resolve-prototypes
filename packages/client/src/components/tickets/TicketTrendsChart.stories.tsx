import type { Meta, StoryObj } from "@storybook/react";
import { TicketTrendsChart } from "./TicketTrendsChart";

const meta: Meta<typeof TicketTrendsChart> = {
	component: TicketTrendsChart,
	title: "Features/Tickets/Ticket Trends Chart",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Line chart comparing manual vs automated ticket handling trends over time. Uses Recharts for visualization.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[600px]">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof TicketTrendsChart>;

export const Default: Story = {
	args: {
		data: [
			{ month: "Jan", manual: 80, automated: 10 },
			{ month: "Feb", manual: 75, automated: 15 },
			{ month: "Mar", manual: 70, automated: 20 },
			{ month: "Apr", manual: 60, automated: 30 },
			{ month: "May", manual: 50, automated: 40 },
			{ month: "Jun", manual: 40, automated: 50 },
		],
	},
};

export const EmptyState: Story = {
	args: {
		data: undefined,
	},
	parameters: {
		docs: {
			description: {
				story: "Empty state shown when no trend data is available yet.",
			},
		},
	},
};

export const CustomData: Story = {
	render: (args) => (
		<TicketTrendsChart
			{...args}
			data={[
				{ month: "Jan", manual: 80, automated: 10 },
				{ month: "Feb", manual: 75, automated: 15 },
				{ month: "Mar", manual: 70, automated: 20 },
				{ month: "Apr", manual: 60, automated: 30 },
				{ month: "May", manual: 50, automated: 40 },
				{ month: "Jun", manual: 40, automated: 50 },
			]}
		/>
	),
};

export const TallerChart: Story = {
	args: {
		height: 256,
	},
};

export const HighAutomation: Story = {
	render: (args) => (
		<TicketTrendsChart
			{...args}
			data={[
				{ month: "Jan", manual: 90, automated: 5 },
				{ month: "Feb", manual: 80, automated: 15 },
				{ month: "Mar", manual: 65, automated: 30 },
				{ month: "Apr", manual: 45, automated: 50 },
				{ month: "May", manual: 30, automated: 65 },
				{ month: "Jun", manual: 20, automated: 75 },
				{ month: "Jul", manual: 15, automated: 80 },
				{ month: "Aug", manual: 10, automated: 85 },
			]}
		/>
	),
};

export const SteadyState: Story = {
	render: (args) => (
		<TicketTrendsChart
			{...args}
			data={[
				{ month: "Jan", manual: 50, automated: 50 },
				{ month: "Feb", manual: 48, automated: 52 },
				{ month: "Mar", manual: 51, automated: 49 },
				{ month: "Apr", manual: 50, automated: 50 },
				{ month: "May", manual: 49, automated: 51 },
				{ month: "Jun", manual: 50, automated: 50 },
			]}
		/>
	),
};
