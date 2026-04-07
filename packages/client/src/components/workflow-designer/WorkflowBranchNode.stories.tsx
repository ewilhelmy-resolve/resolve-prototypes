import type { Meta, StoryObj } from "@storybook/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowBranchNode } from "./WorkflowBranchNode";
import type { ActivityNodeData } from "./workflowDesignerTypes";

const ReactFlowDecorator = (Story: () => React.JSX.Element) => (
	<ReactFlowProvider>
		<div style={{ width: 400, height: 200 }}>
			<ReactFlow nodes={[]} edges={[]} fitView>
				<div
					style={{
						position: "absolute",
						top: 40,
						left: 40,
						zIndex: 10,
					}}
				>
					<Story />
				</div>
			</ReactFlow>
		</div>
	</ReactFlowProvider>
);

const meta: Meta<typeof WorkflowBranchNode> = {
	component: WorkflowBranchNode,
	title: "Features/Workflow Designer/WorkflowBranchNode",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	decorators: [ReactFlowDecorator],
};

export default meta;
type Story = StoryObj<typeof WorkflowBranchNode>;

const baseData: ActivityNodeData = {
	activityType: "if_else",
	label: "If / Else",
	subtitle: "Branch on row count > 0",
	icon: "if_else",
	enabled: true,
	config: { condition: "rowCount > 0" },
};

export const Default: Story = {
	args: {
		id: "branch-1",
		data: baseData,
	},
};

export const Selected: Story = {
	args: {
		id: "branch-2",
		data: baseData,
		selected: true,
	},
};

export const Disabled: Story = {
	args: {
		id: "branch-3",
		data: { ...baseData, enabled: false },
	},
};
