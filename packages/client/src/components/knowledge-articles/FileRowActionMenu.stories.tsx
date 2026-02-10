import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import {
	mockConfluenceFile,
	mockFailedFile,
	mockManualProcessedFile,
	mockManualUploadedFile,
} from "./__mocks__/files";
import { FileRowActionMenu } from "./FileRowActionMenu";

const meta: Meta<typeof FileRowActionMenu> = {
	component: FileRowActionMenu,
	title: "Features/Knowledge Articles/File Row Action Menu",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Dropdown action menu for a file table row. Shows contextual actions based on file source and status (Download, Reprocess, Delete).",
			},
		},
	},
	args: {
		onDownload: fn(),
		onReprocess: fn(),
		onDelete: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof FileRowActionMenu>;

export const ManualProcessed: Story = {
	args: {
		file: mockManualProcessedFile,
	},
};

export const ManualUploaded: Story = {
	args: {
		file: mockManualUploadedFile,
	},
};

export const ConfluenceFile: Story = {
	args: {
		file: mockConfluenceFile,
	},
};

export const FailedFile: Story = {
	args: {
		file: mockFailedFile,
	},
};
