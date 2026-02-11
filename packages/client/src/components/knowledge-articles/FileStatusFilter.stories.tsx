import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { FILE_STATUS } from "@/lib/constants";
import { FileStatusFilter } from "./FileStatusFilter";

const meta: Meta<typeof FileStatusFilter> = {
	component: FileStatusFilter,
	title: "Features/Knowledge Articles/File Status Filter",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Dropdown filter for selecting the file processing status (All, Processed, Processing, Failed, Uploaded).",
			},
		},
	},
	args: {
		onChange: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof FileStatusFilter>;

export const AllSelected: Story = {
	args: {
		value: "All",
	},
};

export const ProcessedSelected: Story = {
	args: {
		value: FILE_STATUS.PROCESSED,
	},
};

export const FailedSelected: Story = {
	args: {
		value: FILE_STATUS.FAILED,
	},
};
