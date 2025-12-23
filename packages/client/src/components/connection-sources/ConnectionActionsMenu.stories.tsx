import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ConnectionActionsMenu } from "./ConnectionActionsMenu";

const meta: Meta<typeof ConnectionActionsMenu> = {
	component: ConnectionActionsMenu,
	title: "Connection Sources/ConnectionActionsMenu",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof ConnectionActionsMenu>;

export const EditOnly: Story = {
	args: {
		onEdit: fn(),
	},
};

export const DisconnectOnly: Story = {
	args: {
		onDisconnect: fn(),
	},
};

export const AllActions: Story = {
	args: {
		onEdit: fn(),
		onDisconnect: fn(),
	},
};

export const NoActions: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: "Menu shows empty when no callbacks provided",
			},
		},
	},
};
