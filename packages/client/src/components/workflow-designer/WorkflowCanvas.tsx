import {
	addEdge,
	Background,
	BackgroundVariant,
	type Connection,
	type Edge,
	MarkerType,
	MiniMap,
	type Node,
	type OnEdgesChange,
	type OnNodesChange,
	Panel,
	ReactFlow,
} from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";
import { Map as MapIcon, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowActivityNode } from "./WorkflowActivityNode";
import { WorkflowBranchNode } from "./WorkflowBranchNode";
import { WorkflowStartNode } from "./WorkflowStartNode";
import type { ActivityType } from "./workflowDesignerTypes";

const nodeTypes = {
	start: WorkflowStartNode,
	activity: WorkflowActivityNode,
	branch: WorkflowBranchNode,
};

interface WorkflowCanvasProps {
	nodes: Node[];
	edges: Edge[];
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
	setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
	onNodeSelect: (nodeId: string | null) => void;
}

export function WorkflowCanvas({
	nodes,
	edges,
	onNodesChange,
	onEdgesChange,
	setEdges,
	setNodes,
	onNodeSelect,
}: WorkflowCanvasProps) {
	const [showMinimap, setShowMinimap] = useState(true);

	const onConnect = useCallback(
		(params: Connection) => {
			setEdges((eds) =>
				addEdge(
					{
						...params,
						type: "smoothstep",
						animated: false,
						style: { stroke: "#94a3b8", strokeWidth: 2 },
						markerEnd: {
							type: MarkerType.ArrowClosed,
							color: "#94a3b8",
						},
					},
					eds,
				),
			);
		},
		[setEdges],
	);

	const onNodeClick = useCallback(
		(_: React.MouseEvent, node: Node) => {
			if (node.type !== "start") {
				onNodeSelect(node.id);
			}
		},
		[onNodeSelect],
	);

	const onPaneClick = useCallback(() => {
		onNodeSelect(null);
	}, [onNodeSelect]);

	const onDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	}, []);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const activityType = e.dataTransfer.getData(
				"application/workflow-activity",
			) as ActivityType;
			const label = e.dataTransfer.getData("application/workflow-label");
			const subtitle = e.dataTransfer.getData("application/workflow-subtitle");

			if (!activityType) return;

			const reactFlowBounds = e.currentTarget.getBoundingClientRect();
			const position = {
				x: e.clientX - reactFlowBounds.left - 120,
				y: e.clientY - reactFlowBounds.top - 30,
			};

			const newNode: Node = {
				id: `${activityType}-${Date.now()}`,
				type: activityType === "if_else" ? "branch" : "activity",
				position,
				data: {
					activityType,
					label: label || activityType,
					subtitle: subtitle || "",
					icon: activityType,
					enabled: true,
					config: {},
				},
			};

			setNodes((prev) => [...prev, newNode]);
			onNodeSelect(newNode.id);
		},
		[setNodes, onNodeSelect],
	);

	const defaultEdgeOptions = useMemo(
		() => ({
			type: "smoothstep" as const,
			animated: false,
			style: { stroke: "#94a3b8", strokeWidth: 2 },
			markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
		}),
		[],
	);

	return (
		<div className="flex-1 min-w-0 relative">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onNodeClick={onNodeClick}
				onPaneClick={onPaneClick}
				onDragOver={onDragOver}
				onDrop={onDrop}
				nodeTypes={nodeTypes}
				fitView
				snapToGrid
				snapGrid={[16, 16]}
				defaultEdgeOptions={defaultEdgeOptions}
				connectionLineStyle={{ stroke: "#94a3b8", strokeWidth: 2 }}
				className="bg-slate-50"
			>
				<Background
					variant={BackgroundVariant.Dots}
					gap={20}
					size={1}
					color="#cbd5e1"
				/>
				{showMinimap && (
					<MiniMap
						className="!bg-white !border-slate-200 !rounded-xl !shadow-lg"
						maskColor="rgba(0, 0, 0, 0.1)"
						position="bottom-right"
					/>
				)}
				<Panel position="bottom-center" className="mb-4">
					<div className="flex items-center gap-1 bg-white rounded-xl shadow-lg border border-slate-200 px-2 py-1.5">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							title="Zoom in"
						>
							<ZoomIn className="w-4 h-4 text-slate-500" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							title="Zoom out"
						>
							<ZoomOut className="w-4 h-4 text-slate-500" />
						</Button>
						<div className="w-px h-6 bg-slate-200 mx-1" />
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							title="Fit view"
						>
							<Maximize2 className="w-4 h-4 text-slate-500" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							title="Toggle minimap"
							onClick={() => setShowMinimap((v) => !v)}
						>
							<MapIcon
								className={`w-4 h-4 ${showMinimap ? "text-blue-500" : "text-slate-500"}`}
							/>
						</Button>
					</div>
				</Panel>
			</ReactFlow>
		</div>
	);
}
