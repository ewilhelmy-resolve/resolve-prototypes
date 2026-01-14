import type { Meta, StoryObj } from "@storybook/react";
import TicketProgressIndicator from "./TicketProgressIndicator";

const meta: Meta<typeof TicketProgressIndicator> = {
	component: TicketProgressIndicator,
	title: "Features/Tickets/Ticket Progress Indicator",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Progress indicator for multi-ticket navigation. Shows current position and visual progress bar.",
			},
		},
	},
	argTypes: {
		currentIndex: {
			control: { type: "number", min: 0 },
			description: "Zero-based index of current ticket",
		},
		total: {
			control: { type: "number", min: 1 },
			description: "Total number of tickets",
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
type Story = StoryObj<typeof TicketProgressIndicator>;

export const Default: Story = {
	args: {
		currentIndex: 0,
		total: 5,
	},
};

export const Midway: Story = {
	args: {
		currentIndex: 2,
		total: 5,
	},
};

export const Complete: Story = {
	args: {
		currentIndex: 4,
		total: 5,
	},
};

export const SingleTicket: Story = {
	args: {
		currentIndex: 0,
		total: 1,
	},
};

export const LargeSet: Story = {
	args: {
		currentIndex: 47,
		total: 100,
	},
};
