import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./spinner";

const meta: Meta<typeof Spinner> = {
	component: Spinner,
	title: "Components/Feedback/Spinner",
	tags: ["autodocs"],
	argTypes: {
		className: {
			control: "text",
		},
	},
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Small: Story = {
	args: {
		className: "size-3",
	},
};

export const Medium: Story = {
	args: {
		className: "size-6",
	},
};

export const Large: Story = {
	args: {
		className: "size-10",
	},
};

export const CustomColor: Story = {
	args: {
		className: "size-6 text-blue-500",
	},
};

export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Spinner className="size-3" />
			<Spinner className="size-4" />
			<Spinner className="size-6" />
			<Spinner className="size-8" />
			<Spinner className="size-10" />
		</div>
	),
};
