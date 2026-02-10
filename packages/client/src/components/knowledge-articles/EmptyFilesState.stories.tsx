import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import EmptyFilesState from "./EmptyFilesState";

const meta: Meta<typeof EmptyFilesState> = {
	component: EmptyFilesState,
	title: "Features/Knowledge Articles/Empty Files State",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Empty state shown when no knowledge articles exist or when filters return no results.",
			},
		},
	},
	args: {
		onUploadClick: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof EmptyFilesState>;

export const NoFiles: Story = {
	args: {
		hasActiveFilters: false,
	},
};

export const NoResults: Story = {
	args: {
		hasActiveFilters: true,
	},
};
