import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AutomationMetricsCard } from "./AutomationMetricsCard";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, gcTime: 0 },
	},
});

const meta: Meta<typeof AutomationMetricsCard> = {
	component: AutomationMetricsCard,
	title: "Features/Tickets/Automation Metrics Card",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Displays key automation metrics in a 3-column grid: automated count, minutes saved, and cost savings. Savings are computed from autopilot settings (cost/time per ticket).",
			},
		},
	},
	decorators: [
		(Story) => (
			<QueryClientProvider client={queryClient}>
				<div className="w-80">
					<Story />
				</div>
			</QueryClientProvider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof AutomationMetricsCard>;

export const Default: Story = {
	args: {
		automated: 0,
	},
};

export const WithData: Story = {
	args: {
		automated: 127,
	},
};

export const HighVolume: Story = {
	args: {
		automated: 1542,
	},
};

export const SmallSavings: Story = {
	args: {
		automated: 15,
	},
};
