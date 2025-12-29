import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ShareModal } from "./ShareModal";

const meta: Meta<typeof ShareModal> = {
	component: ShareModal,
	title: "Components/ShareModal",
	tags: ["autodocs"],
	args: {
		open: true,
		onOpenChange: fn(),
		onNavigateToSettings: fn(),
	},
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Modal for sharing RITA access with team members. Includes search and user selection.",
			},
			story: {
				inline: false,
				iframeHeight: 500,
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof ShareModal>;

export const Default: Story = {
	args: {},
};

export const Closed: Story = {
	args: {
		open: false,
	},
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story: "Modal is hidden when open prop is false",
			},
		},
	},
};
