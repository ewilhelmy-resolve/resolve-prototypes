import type { Meta, StoryObj } from "@storybook/react";
import { ValidationConfidenceCard } from "./ValidationConfidenceCard";

const meta: Meta<typeof ValidationConfidenceCard> = {
	component: ValidationConfidenceCard,
	title: "Features/Tickets/Validation Confidence Card",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Progress card showing validation confidence level. Displays validated count, progress bar, and dynamic description based on progress.",
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
type Story = StoryObj<typeof ValidationConfidenceCard>;

export const Default: Story = {
	args: {
		validated: 0,
		total: 16,
	},
};

export const InProgress: Story = {
	args: {
		validated: 5,
		total: 16,
	},
};

export const HalfwayThere: Story = {
	args: {
		validated: 8,
		total: 16,
	},
};

export const AlmostComplete: Story = {
	args: {
		validated: 14,
		total: 16,
	},
};

export const Complete: Story = {
	args: {
		validated: 16,
		total: 16,
	},
};

export const CustomTotal: Story = {
	args: {
		validated: 25,
		total: 50,
	},
};
