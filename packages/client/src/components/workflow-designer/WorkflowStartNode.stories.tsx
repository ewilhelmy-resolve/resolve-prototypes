import type { Meta, StoryObj } from "@storybook/react";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowStartNode } from "./WorkflowStartNode";

const ReactFlowDecorator = (Story: () => React.JSX.Element) => (
	<ReactFlowProvider>
		<div style={{ padding: 40 }}>
			<Story />
		</div>
	</ReactFlowProvider>
);

const meta: Meta<typeof WorkflowStartNode> = {
	component: WorkflowStartNode,
	title: "Features/Workflow Designer/WorkflowStartNode",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	decorators: [ReactFlowDecorator],
};

export default meta;
type Story = StoryObj<typeof WorkflowStartNode>;

const baseProps = {
	id: "start-1",
	type: "start" as const,
	position: { x: 0, y: 0 },
	dragging: false,
	zIndex: 0,
	isConnectable: true,
	positionAbsoluteX: 0,
	positionAbsoluteY: 0,
	width: 200,
	height: 40,
	selected: false,
	dragHandle: undefined,
	sourcePosition: undefined,
	targetPosition: undefined,
	parentId: undefined,
	deletable: true,
	selectable: true,
	connectable: true,
	focusable: true,
};

export const Manual: Story = {
	args: {
		...baseProps,
		data: {
			label: "START",
			subtitle: "",
			icon: "play",
			enabled: true,
			activityType: "split",
			config: { triggerType: "manual" },
		},
	},
};

export const Webhook: Story = {
	args: {
		...baseProps,
		data: {
			label: "START",
			subtitle: "",
			icon: "play",
			enabled: true,
			activityType: "split",
			config: { triggerType: "webhook" },
		},
	},
};

export const Schedule: Story = {
	args: {
		...baseProps,
		data: {
			label: "START",
			subtitle: "",
			icon: "play",
			enabled: true,
			activityType: "split",
			config: { triggerType: "schedule", interval: "1h" },
		},
	},
};

export const Event: Story = {
	args: {
		...baseProps,
		data: {
			label: "START",
			subtitle: "",
			icon: "play",
			enabled: true,
			activityType: "split",
			config: { triggerType: "event" },
		},
	},
};

export const Selected: Story = {
	args: {
		...baseProps,
		selected: true,
		data: {
			label: "START",
			subtitle: "",
			icon: "play",
			enabled: true,
			activityType: "split",
			config: { triggerType: "manual" },
		},
	},
};
