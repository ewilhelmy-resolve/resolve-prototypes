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
		onSave: fn(),
		defaultValues: {
			blendedRatePerHour: 30,
			avgMinutesPerTicket: 12,
		},
	},
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Reusable settings dialog for configuring dashboard metric calculations (blended rate per hour, average minutes per ticket). Returns selected values via onSave callback. Save is disabled until the user modifies a value.",
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
	parameters: {
		docs: {
			description: {
				story:
					"Default state with pre-filled values ($30.00/hr, 12 minutes). Save button is disabled until user changes a field.",
			},
		},
	},
};

export const WithCustomValues: Story = {
	args: {
		defaultValues: {
			blendedRatePerHour: 55,
			avgMinutesPerTicket: 8,
		},
	},
	parameters: {
		docs: {
			description: {
				story:
					"Dialog with custom values to demonstrate the calculator section updating in real-time.",
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
