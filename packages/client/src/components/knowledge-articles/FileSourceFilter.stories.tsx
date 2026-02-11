import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { FILE_SOURCE, FILE_SOURCE_DISPLAY_NAMES } from "@/lib/constants";
import { FileSourceFilter } from "./FileSourceFilter";

const meta: Meta<typeof FileSourceFilter> = {
	component: FileSourceFilter,
	title: "Features/Knowledge Articles/File Source Filter",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Dropdown filter for selecting the file source (All, Manual, Jira Confluence).",
			},
		},
	},
	args: {
		onChange: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof FileSourceFilter>;

export const AllSelected: Story = {
	args: {
		value: "All",
	},
};

export const ManualSelected: Story = {
	args: {
		value: FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.MANUAL],
	},
};

export const ConfluenceSelected: Story = {
	args: {
		value: FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.CONFLUENCE],
	},
};
