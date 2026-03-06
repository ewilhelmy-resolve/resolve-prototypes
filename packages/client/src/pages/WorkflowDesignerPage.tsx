import {
	type Edge,
	type Node,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import { FilePlus, FileText, Plus, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import RitaLayout from "@/components/layouts/RitaLayout";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkflowCanvas } from "@/components/workflow-designer/WorkflowCanvas";
import { WorkflowConfigPanel } from "@/components/workflow-designer/WorkflowConfigPanel";
import { WorkflowJarvisPanel } from "@/components/workflow-designer/WorkflowJarvisPanel";
import {
	DEFAULT_EDGES,
	DEFAULT_NODES,
	GOOGLE_PASSWORD_RESET_EDGES,
	GOOGLE_PASSWORD_RESET_NODES,
	WORKFLOW_TEMPLATES,
} from "@/components/workflow-designer/workflowDesignerData";
import type {
	ActivityConfig,
	ActivityNodeData,
	WorkflowTab,
} from "@/components/workflow-designer/workflowDesignerTypes";

export default function WorkflowDesignerPage() {
	// Workflow tabs
	const [tabs, setTabs] = useState<WorkflowTab[]>([
		{ id: "new-1", name: "New Workflow" },
	]);
	const [activeTabId, setActiveTabId] = useState("new-1");

	// React Flow state — start empty for demo
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

	// Selection state
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

	const selectedNode = useMemo(
		() =>
			selectedNodeId
				? (nodes.find((n) => n.id === selectedNodeId) ?? null)
				: null,
		[nodes, selectedNodeId],
	);

	const handleNodeSelect = useCallback((nodeId: string | null) => {
		setSelectedNodeId(nodeId);
	}, []);

	const handleUpdateConfig = useCallback(
		(nodeId: string, config: ActivityConfig) => {
			setNodes((prev) =>
				prev.map((n) =>
					n.id === nodeId
						? {
								...n,
								data: { ...(n.data as unknown as ActivityNodeData), config },
							}
						: n,
				),
			);
		},
		[setNodes],
	);

	const loadTemplateData = useCallback(
		(templateId: string) => {
			if (templateId === "azure-ad-offboarding") {
				setNodes(DEFAULT_NODES as Node[]);
				setEdges(DEFAULT_EDGES);
			} else if (templateId === "google-password-reset") {
				setNodes(GOOGLE_PASSWORD_RESET_NODES as Node[]);
				setEdges(GOOGLE_PASSWORD_RESET_EDGES);
			} else {
				setNodes([]);
				setEdges([]);
			}
			setSelectedNodeId(null);
		},
		[setNodes, setEdges],
	);

	const handleLoadTemplate = useCallback(
		(templateId: string) => {
			loadTemplateData(templateId);
		},
		[loadTemplateData],
	);

	const handleRenameTab = useCallback(
		(name: string) => {
			setTabs((prev) =>
				prev.map((t) => (t.id === activeTabId ? { ...t, name } : t)),
			);
		},
		[activeTabId],
	);

	const handleAddTab = (templateId?: string) => {
		const id = `tab-${Date.now()}`;
		const template = templateId
			? WORKFLOW_TEMPLATES.find((t) => t.id === templateId)
			: null;
		setTabs((prev) => [
			...prev,
			{ id, name: template?.name ?? "New Workflow" },
		]);
		setActiveTabId(id);
		loadTemplateData(templateId ?? "");
	};

	const handleCloseTab = (tabId: string) => {
		if (tabs.length <= 1) return;
		const remaining = tabs.filter((t) => t.id !== tabId);
		setTabs(remaining);
		if (activeTabId === tabId) {
			setActiveTabId(remaining[0].id);
		}
	};

	return (
		<RitaLayout activePage="automations">
			<div className="h-full flex flex-col">
				{/* Workflow tabs bar */}
				<div className="h-10 bg-white border-b border-slate-200 flex items-center px-4 shrink-0">
					<span className="text-sm font-semibold text-slate-800 mr-4">
						Workflow Designer
					</span>
					<div className="flex items-center gap-1">
						{tabs.map((tab) => (
							<div
								key={tab.id}
								role="tab"
								tabIndex={0}
								aria-selected={activeTabId === tab.id}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
									activeTabId === tab.id
										? "bg-blue-50 text-blue-700 font-medium"
										: "text-slate-500 hover:bg-slate-100"
								}`}
								onClick={() => setActiveTabId(tab.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setActiveTabId(tab.id);
									}
								}}
							>
								<span className="truncate max-w-[140px]">{tab.name}</span>
								{tabs.length > 1 && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleCloseTab(tab.id);
										}}
										className="p-0.5 hover:bg-slate-200 rounded transition-colors"
										aria-label={`Close ${tab.name}`}
									>
										<X className="w-3 h-3" />
									</button>
								)}
							</div>
						))}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									aria-label="Add new workflow"
								>
									<Plus className="w-4 h-4 text-slate-500" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-56">
								<DropdownMenuItem onClick={() => handleAddTab()}>
									<FilePlus className="w-4 h-4 mr-2" />
									New Workflow
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuLabel className="text-xs text-slate-400">
									From Template
								</DropdownMenuLabel>
								{WORKFLOW_TEMPLATES.map((t) => (
									<DropdownMenuItem
										key={t.id}
										onClick={() => handleAddTab(t.id)}
									>
										<FileText className="w-4 h-4 mr-2" />
										{t.name}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* 3-panel layout */}
				<div className="flex-1 flex overflow-hidden">
					<WorkflowJarvisPanel
						key={activeTabId}
						onLoadTemplate={handleLoadTemplate}
						onRenameTab={handleRenameTab}
						hasWorkflow={nodes.length > 0}
					/>
					<WorkflowCanvas
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						setEdges={setEdges}
						setNodes={setNodes}
						onNodeSelect={handleNodeSelect}
					/>
					<WorkflowConfigPanel
						selectedNode={selectedNode}
						onUpdateConfig={handleUpdateConfig}
						onClose={() => setSelectedNodeId(null)}
					/>
				</div>
			</div>
		</RitaLayout>
	);
}
