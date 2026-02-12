import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import TicketSettingsDialog from "./TicketSettingsDialog";

const meta: Meta<typeof TicketSettingsDialog> = {
	component: TicketSettingsDialog,
	title: "Features/Tickets/Ticket Settings Dialog",
	tags: ["autodocs"],
	args: {
		open: true,
		onOpenChange: fn(),
	},
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Settings dialog for configuring dashboard metric calculations (cost per ticket, average time per ticket). Save is disabled until the user modifies a value.",
			},
			story: {
				inline: false,
				iframeHeight: 600,
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof TicketSettingsDialog>;

export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story:
					"Default state with pre-filled values ($30.00 cost, 12 minutes). Save button is disabled until user changes a field.",
			},
		},
	},
};

export const Closed: Story = {
	args: {
		open: false,
	},
	parameters: {
		docs: {
			description: {
				story: "Dialog is hidden when open prop is false.",
			},
		},
	},
};
