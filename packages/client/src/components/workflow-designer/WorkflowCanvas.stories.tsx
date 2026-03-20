import type { Meta, StoryObj } from "@storybook/react";
import {
	type Edge,
	type Node,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";
import { WorkflowCanvas } from "./WorkflowCanvas";
import {
	DEFAULT_EDGES,
	DEFAULT_NODES,
	GOOGLE_PASSWORD_RESET_EDGES,
	GOOGLE_PASSWORD_RESET_NODES,
} from "./workflowDesignerData";

function CanvasWrapper({
	initialNodes,
	initialEdges,
}: {
	initialNodes: Node[];
	initialEdges: Edge[];
}) {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const onNodeSelect = useCallback((nodeId: string | null) => {
		console.log("Selected node:", nodeId);
	}, []);

	return (
		<div style={{ width: "100vw", height: "100vh" }}>
			<WorkflowCanvas
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				setEdges={setEdges}
				setNodes={setNodes}
				onNodeSelect={onNodeSelect}
			/>
		</div>
	);
}

const meta: Meta<typeof WorkflowCanvas> = {
	component: WorkflowCanvas,
	title: "Features/Workflow Designer/WorkflowCanvas",
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<ReactFlowProvider>
				<Story />
			</ReactFlowProvider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof WorkflowCanvas>;

export const Empty: Story = {
	render: () => <CanvasWrapper initialNodes={[]} initialEdges={[]} />,
};

export const AzureOffboarding: Story = {
	render: () => (
		<CanvasWrapper
			initialNodes={DEFAULT_NODES}
			initialEdges={DEFAULT_EDGES}
		/>
	),
};

export const GooglePasswordReset: Story = {
	render: () => (
		<CanvasWrapper
			initialNodes={GOOGLE_PASSWORD_RESET_NODES}
			initialEdges={GOOGLE_PASSWORD_RESET_EDGES}
		/>
	),
};
