import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";
import { Label } from "./label";

const meta: Meta<typeof Textarea> = {
	component: Textarea,
	title: "Components/Forms/Textarea",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
	args: {
		className: "w-[300px]",
	},
};

export const WithPlaceholder: Story = {
	args: {
		placeholder: "Type your message here...",
		className: "w-[300px]",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		placeholder: "Disabled textarea",
		className: "w-[300px]",
	},
};

export const WithValue: Story = {
	args: {
		defaultValue: "This is some default content in the textarea.",
		className: "w-[300px]",
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex flex-col gap-2 w-[300px]">
			<Label htmlFor="message">Your Message</Label>
			<Textarea id="message" placeholder="Type your message here..." />
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div className="flex flex-col gap-4 w-[300px]">
			<div className="flex flex-col gap-2">
				<Label htmlFor="default">Default</Label>
				<Textarea id="default" placeholder="Default textarea" />
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor="with-value">With Value</Label>
				<Textarea id="with-value" defaultValue="Some content here" />
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor="disabled">Disabled</Label>
				<Textarea id="disabled" disabled placeholder="Disabled" />
			</div>
		</div>
	),
};
