import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SchemaDebugPanel } from "../SchemaDebugPanel";

const meta = {
	component: SchemaDebugPanel,
	title: "Features/Schema Renderer/Composites/SchemaDebugPanel",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			story: {
				inline: false,
				iframeHeight: 500,
			},
		},
	},
} satisfies Meta<typeof SchemaDebugPanel>;

export default meta;
type Story = StoryObj<typeof SchemaDebugPanel>;

export const Default: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{ type: "text", content: "Hello World", variant: "heading" },
				{ type: "button", label: "Click Me", action: "test" },
			],
		},
		lastAction: null,
		actionHistory: [],
		isVisible: true,
		onToggle: fn(),
	},
};

export const WithActions: Story = {
	args: {
		schema: {
			version: "1",
			components: [
				{ type: "text", content: "Dashboard", variant: "heading" },
				{ type: "stat", label: "Users", value: 42 },
			],
		},
		lastAction: {
			action: "delete_item",
			data: { id: "123" },
			messageId: "msg-2",
			conversationId: "conv-1",
			timestamp: "2024-01-15T10:31:00Z",
		},
		actionHistory: [
			{
				action: "save_config",
				data: { name: "Test" },
				messageId: "msg-1",
				conversationId: "conv-1",
				timestamp: "2024-01-15T10:30:00Z",
			},
			{
				action: "delete_item",
				data: { id: "123" },
				messageId: "msg-2",
				conversationId: "conv-1",
				timestamp: "2024-01-15T10:31:00Z",
			},
		],
		isVisible: true,
		onToggle: fn(),
	},
};

export const Collapsed: Story = {
	args: {
		schema: {
			version: "1",
			components: [{ type: "text", content: "Hidden panel", variant: "muted" }],
		},
		lastAction: null,
		actionHistory: [],
		isVisible: false,
		onToggle: fn(),
	},
};

export const NoSchema: Story = {
	args: {
		schema: null,
		lastAction: null,
		actionHistory: [],
		isVisible: true,
		onToggle: fn(),
	},
};
