import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import ConfirmDialog from "./ConfirmDialog";

const meta: Meta<typeof ConfirmDialog> = {
	component: ConfirmDialog,
	title: "Components/Overlays/Confirm Dialog",
	tags: ["autodocs"],
	args: {
		open: true,
		onOpenChange: fn(),
		onConfirm: fn(),
	},
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Reusable confirmation dialog with default and destructive variants. Built on AlertDialog for accessibility.",
			},
			story: {
				inline: false, // Render in iframe to isolate fixed positioning
				iframeHeight: 300,
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
	args: {
		title: "Confirm Action",
		description: "Are you sure you want to proceed with this action?",
	},
};

export const Destructive: Story = {
	args: {
		title: "Delete Item",
		description:
			"This action cannot be undone. This will permanently delete the item and all associated data.",
		variant: "destructive",
		confirmLabel: "Delete",
	},
};

export const CustomLabels: Story = {
	args: {
		title: "Discard Changes",
		description:
			"You have unsaved changes. Are you sure you want to discard them?",
		confirmLabel: "Discard",
		cancelLabel: "Keep Editing",
	},
};

export const LogoutConfirmation: Story = {
	args: {
		title: "Sign Out",
		description: "Are you sure you want to sign out of your account?",
		confirmLabel: "Sign Out",
		cancelLabel: "Stay Signed In",
	},
};

export const DeleteUser: Story = {
	args: {
		title: "Remove Team Member",
		description:
			"Are you sure you want to remove this user from your organization? They will lose access to all resources.",
		variant: "destructive",
		confirmLabel: "Remove User",
		cancelLabel: "Cancel",
	},
};

export const CancelSubscription: Story = {
	args: {
		title: "Cancel Subscription",
		description:
			"Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.",
		variant: "destructive",
		confirmLabel: "Cancel Subscription",
		cancelLabel: "Keep Subscription",
	},
};

export const Closed: Story = {
	args: {
		open: false,
		title: "Hidden Dialog",
		description: "This dialog is not visible",
	},
	parameters: {
		docs: {
			description: {
				story: "Dialog is hidden when open prop is false",
			},
		},
	},
};
