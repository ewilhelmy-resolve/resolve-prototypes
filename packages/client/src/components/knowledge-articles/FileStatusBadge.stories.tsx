import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { FILE_STATUS } from "@/lib/constants";
import { FileStatusBadge } from "./FileStatusBadge";

const meta: Meta<typeof FileStatusBadge> = {
	component: FileStatusBadge,
	title: "Features/Knowledge Articles/File Status Badge",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Displays the processing status of a knowledge article file with an icon, label, and optional retry action for failed files.",
			},
		},
	},
	args: {
		onRetry: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof FileStatusBadge>;

export const Processed: Story = {
	args: {
		status: FILE_STATUS.PROCESSED,
	},
};

export const Processing: Story = {
	args: {
		status: FILE_STATUS.PROCESSING,
	},
};

export const Failed: Story = {
	args: {
		status: FILE_STATUS.FAILED,
	},
};

export const FailedRetrying: Story = {
	args: {
		status: FILE_STATUS.FAILED,
		isRetrying: true,
	},
};

export const Uploaded: Story = {
	args: {
		status: FILE_STATUS.UPLOADED,
	},
};

export const Pending: Story = {
	args: {
		status: FILE_STATUS.PENDING,
	},
};

export const Syncing: Story = {
	args: {
		status: FILE_STATUS.SYNCING,
	},
};

export const AllStatuses: Story = {
	render: () => (
		<div className="flex flex-col gap-3">
			{Object.entries(FILE_STATUS).map(([key, status]) => (
				<div key={key} className="flex items-center gap-4">
					<span className="text-sm text-muted-foreground w-28">
						{key.charAt(0) + key.slice(1).toLowerCase()}
					</span>
					<FileStatusBadge
						status={status}
						onRetry={status === FILE_STATUS.FAILED ? fn() : undefined}
					/>
				</div>
			))}
		</div>
	),
};
