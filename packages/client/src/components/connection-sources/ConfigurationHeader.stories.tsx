import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ConfigurationHeader } from "./ConfigurationHeader";

const meta: Meta<typeof ConfigurationHeader> = {
	component: ConfigurationHeader,
	title: "Features/Connections/Configuration Header",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<div className="w-full p-4">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ConfigurationHeader>;

export const Confluence: Story = {
	args: {
		title: "Confluence",
		onEdit: fn(),
	},
};

export const ServiceNow: Story = {
	args: {
		title: "ServiceNow",
		onEdit: fn(),
	},
};

export const SharePoint: Story = {
	args: {
		title: "SharePoint",
		onEdit: fn(),
	},
};

export const WebSearch: Story = {
	args: {
		title: "Web Search",
		onEdit: fn(),
	},
};

export const WithDisconnect: Story = {
	args: {
		title: "Confluence",
		onEdit: fn(),
		onDisconnect: fn(),
	},
};

export const NoActions: Story = {
	args: {
		title: "Read Only Source",
	},
};
