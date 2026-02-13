import type { Meta, StoryObj } from "@storybook/react";
import { UploadProgressBar } from "./UploadProgressBar";

const meta: Meta<typeof UploadProgressBar> = {
	component: UploadProgressBar,
	title: "Features/Knowledge Articles/Upload Progress Bar",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Displays multi-file upload progress with a spinner, counter, and progress bar.",
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof UploadProgressBar>;

export const Start: Story = {
	args: {
		current: 1,
		total: 5,
	},
};

export const Midway: Story = {
	args: {
		current: 3,
		total: 5,
	},
};

export const AlmostDone: Story = {
	args: {
		current: 4,
		total: 5,
	},
};

export const SingleFile: Story = {
	args: {
		current: 1,
		total: 1,
	},
};
