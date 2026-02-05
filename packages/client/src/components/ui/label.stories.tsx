import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";

const meta: Meta<typeof Label> = {
	component: Label,
	title: "Components/Forms/Label",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
	args: {
		children: "Email",
	},
};

export const Required: Story = {
	render: () => (
		<Label>
			Email <span className="text-destructive">*</span>
		</Label>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className="group" data-disabled="true">
			<Label>Disabled Label</Label>
		</div>
	),
};

export const WithDescription: Story = {
	render: () => (
		<div className="flex flex-col gap-1">
			<Label htmlFor="email">Email</Label>
			<span className="text-sm text-muted-foreground">
				Enter your email address
			</span>
		</div>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div>
				<Label>Default Label</Label>
			</div>
			<div>
				<Label>
					Required Field <span className="text-destructive">*</span>
				</Label>
			</div>
			<div className="flex flex-col gap-1">
				<Label>With Description</Label>
				<span className="text-sm text-muted-foreground">
					This is a helpful description
				</span>
			</div>
			<div className="group" data-disabled="true">
				<Label>Disabled Label</Label>
			</div>
		</div>
	),
};
