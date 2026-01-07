import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "./switch";
import { Label } from "./label";

const meta: Meta<typeof Switch> = {
	component: Switch,
	title: "Components/Forms/Switch",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const Checked: Story = {
	args: {
		defaultChecked: true,
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		disabled: true,
		defaultChecked: true,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<Switch id="airplane-mode" />
			<Label htmlFor="airplane-mode">Airplane Mode</Label>
		</div>
	),
};

export const AllStates: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<Switch id="off" />
				<Label htmlFor="off">Off</Label>
			</div>
			<div className="flex items-center gap-2">
				<Switch id="on" defaultChecked />
				<Label htmlFor="on">On</Label>
			</div>
			<div className="flex items-center gap-2">
				<Switch id="disabled-off" disabled />
				<Label htmlFor="disabled-off">Disabled Off</Label>
			</div>
			<div className="flex items-center gap-2">
				<Switch id="disabled-on" disabled defaultChecked />
				<Label htmlFor="disabled-on">Disabled On</Label>
			</div>
		</div>
	),
};
