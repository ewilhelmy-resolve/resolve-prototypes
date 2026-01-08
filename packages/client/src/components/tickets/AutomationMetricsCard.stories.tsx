import type { Meta, StoryObj } from "@storybook/react";
import { AutomationMetricsCard } from "./AutomationMetricsCard";

const meta: Meta<typeof AutomationMetricsCard> = {
	component: AutomationMetricsCard,
	title: "Features/Tickets/Automation Metrics Card",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Displays key automation metrics in a 3-column grid: automated count, minutes saved, and cost savings.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof AutomationMetricsCard>;

export const Default: Story = {
	args: {
		automated: 0,
		minsSaved: 0,
		savings: 0,
	},
};

export const WithData: Story = {
	args: {
		automated: 127,
		minsSaved: 845,
		savings: 2500,
	},
};

export const HighVolume: Story = {
	args: {
		automated: 1542,
		minsSaved: 12500,
		savings: 45000,
	},
};

export const SmallSavings: Story = {
	args: {
		automated: 15,
		minsSaved: 90,
		savings: 150,
	},
};
