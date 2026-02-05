import type { Meta, StoryObj } from "@storybook/react";
import { ProTipBadge } from "./ProTipBadge";

const meta: Meta<typeof ProTipBadge> = {
	component: ProTipBadge,
	title: "Features/Tickets/Pro Tip Badge",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A badge component for displaying pro tips with a lightbulb icon and styled text.",
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof ProTipBadge>;

export const Default: Story = {
	args: {
		children: "Continued review helps confirm patterns across more tickets.",
	},
};

export const KnowledgeTip: Story = {
	args: {
		children: "Improving knowledge coverage often has the biggest impact on response quality.",
	},
};

export const AutomationTip: Story = {
	args: {
		children: "Consistent results contribute to automation readiness over time.",
	},
};

export const ShortTip: Story = {
	args: {
		children: "Keep reviewing to build confidence.",
	},
};

export const LongTip: Story = {
	args: {
		children: "Early reviews help identify the most important gaps to address when creating knowledge articles for your team.",
	},
	decorators: [
		(Story) => (
			<div className="max-w-md">
				<Story />
			</div>
		),
	],
};
