import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { AutomationReadinessMeter } from "./AutomationReadinessMeter";

const meta: Meta<typeof AutomationReadinessMeter> = {
	component: AutomationReadinessMeter,
	title: "Features/Tickets/Automation Readiness Meter",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Shows automation readiness state based on review metrics and knowledge availability.",
			},
		},
	},
	args: {
		onEnableAutoRespond: fn(),
		onReviewKnowledge: fn(),
		onAddKnowledge: fn(),
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
type Story = StoryObj<typeof AutomationReadinessMeter>;

/** Ready state: ≥80% trusted reviews with knowledge */
export const Ready: Story = {
	args: {
		reviewed: 13,
		total: 16,
		hasKnowledge: true,
		trustedPercentage: 85,
	},
};

/** Partial state: 50-79% trusted reviews with knowledge */
export const Partial: Story = {
	args: {
		reviewed: 3,
		total: 16,
		hasKnowledge: true,
		trustedPercentage: 65,
	},
};

/** Low state: <50% trusted reviews with knowledge */
export const Low: Story = {
	args: {
		reviewed: 3,
		total: 16,
		hasKnowledge: true,
		trustedPercentage: 35,
	},
};

/** Not ready state: no knowledge, with some reviews */
export const NotReadyWithReviews: Story = {
	args: {
		reviewed: 4,
		total: 16,
		hasKnowledge: false,
		trustedPercentage: 0,
	},
};

/** Not ready state: no knowledge, no reviews */
export const NotReadyNoReviews: Story = {
	args: {
		reviewed: 0,
		total: 16,
		hasKnowledge: false,
		trustedPercentage: 0,
	},
};
