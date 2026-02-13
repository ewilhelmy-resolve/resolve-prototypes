import type { Meta, StoryObj } from "@storybook/react";
import { FileUploadRequirements } from "./FileUploadRequirements";

const meta: Meta<typeof FileUploadRequirements> = {
	component: FileUploadRequirements,
	title: "Features/Knowledge Articles/File Upload Requirements",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Displays supported file types and maximum file size for Knowledge Article uploads.",
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof FileUploadRequirements>;

export const Default: Story = {
	args: {},
};

export const WithCustomClass: Story = {
	args: {
		className: "text-left",
	},
};
