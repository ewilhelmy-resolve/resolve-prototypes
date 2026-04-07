import type { Meta, StoryObj } from "@storybook/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowActivityNode } from "./WorkflowActivityNode";
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

const meta: Meta<typeof WorkflowActivityNode> = {
	component: WorkflowActivityNode,
	title: "Features/Workflow Designer/WorkflowActivityNode",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	decorators: [ReactFlowDecorator],
};

export default meta;
type Story = StoryObj<typeof WorkflowActivityNode>;

const makeData = (
	overrides: Partial<ActivityNodeData> = {},
): ActivityNodeData => ({
	activityType: "azure_user",
	label: "Azure AD User",
	subtitle: "Fetch user from Azure AD",
	icon: "azure_user",
	enabled: true,
	config: {},
	...overrides,
});

export const Default: Story = {
	args: {
		id: "activity-1",
		data: makeData(),
	},
};

export const Disabled: Story = {
	args: {
		id: "activity-2",
		data: makeData({ enabled: false }),
	},
};

export const Selected: Story = {
	args: {
		id: "activity-3",
		data: makeData(),
		selected: true,
	},
};

export const Split: Story = {
	args: {
		id: "activity-4",
		data: makeData({
			activityType: "split",
			label: "Split",
			subtitle: "Split full name into parts",
		}),
	},
};

export const FilterResults: Story = {
	args: {
		id: "activity-5",
		data: makeData({
			activityType: "filter_results",
			label: "Filter Results",
			subtitle: "Filter matching records",
		}),
	},
};

export const IfElse: Story = {
	args: {
		id: "activity-6",
		data: makeData({
			activityType: "if_else",
			label: "If / Else",
			subtitle: "Branch on condition",
		}),
	},
};

export const SendEmail: Story = {
	args: {
		id: "activity-7",
		data: makeData({
			activityType: "send_email",
			label: "Send Credentials",
			subtitle: "Email temp password to user",
		}),
	},
};

export const GoogleUser: Story = {
	args: {
		id: "activity-8",
		data: makeData({
			activityType: "google_user",
			label: "Google Workspace Lookup",
			subtitle: "Find user in Google Admin",
		}),
	},
};
