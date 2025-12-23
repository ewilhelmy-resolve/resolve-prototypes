import type { Meta, StoryObj } from "@storybook/react";
import { MessageStatus } from "./MessageStatus";

const meta: Meta<typeof MessageStatus> = {
	component: MessageStatus,
	title: "Components/MessageStatus",
	tags: ["autodocs"],
	argTypes: {
		status: {
			control: "select",
			options: ["pending", "processing", "completed", "failed"],
		},
		errorMessage: {
			control: "text",
		},
	},
};

export default meta;
type Story = StoryObj<typeof MessageStatus>;

export const Pending: Story = {
	args: {
		status: "pending",
	},
};

export const Processing: Story = {
	args: {
		status: "processing",
	},
};

export const Completed: Story = {
	args: {
		status: "completed",
	},
};

export const Failed: Story = {
	args: {
		status: "failed",
	},
};

export const FailedWithError: Story = {
	args: {
		status: "failed",
		errorMessage: "Connection timeout after 30 seconds",
	},
};

export const AllStatuses: Story = {
	render: () => (
		<div className="flex flex-col gap-2">
			<MessageStatus status="pending" />
			<MessageStatus status="processing" />
			<MessageStatus status="completed" />
			<MessageStatus status="failed" />
			<MessageStatus status="failed" errorMessage="Network error" />
		</div>
	),
};
