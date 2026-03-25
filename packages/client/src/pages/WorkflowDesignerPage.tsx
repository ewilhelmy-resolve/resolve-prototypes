import {
	type Edge,
	type Node,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import {
	Braces,
	CheckCircle,
	FilePlus,
	FileText,
	History,
	MoreVertical,
	Play,
	Plus,
	Upload,
	X,
} from "lucide-react";
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
import { WorkflowConfigPanelV2 } from "@/components/workflow-designer/WorkflowConfigPanelV2";
import { WorkflowJarvisPanel } from "@/components/workflow-designer/WorkflowJarvisPanel";
import { WorkflowSkillMetadataDialog } from "@/components/workflow-designer/WorkflowSkillMetadataDialog";
import { WorkflowSkillAutoDetectDialog } from "@/components/workflow-designer/WorkflowSkillAutoDetectDialog";
import { WorkflowSkillVariableDialog } from "@/components/workflow-designer/WorkflowSkillVariableDialog";
import {
	DEFAULT_EDGES,
	DEFAULT_NODES,
	GOOGLE_PASSWORD_RESET_EDGES,
	GOOGLE_PASSWORD_RESET_NODES,
	WORKFLOW_TEMPLATES,
} from "@/components/workflow-designer/workflowDesignerData";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { toast } from "@/lib/toast";
import type {
	ActivityConfig,
	ActivityNodeData,
	SkillMetadata,
	WorkflowTab,
} from "@/components/workflow-designer/workflowDesignerTypes";

const DEFAULT_SKILL_METADATA: SkillMetadata = {
	name: "",
	description: "",
	toolEid: "",
	inputsJson: "",
	outputsJson: "",
};

export default function WorkflowDesignerPage() {
	const isV2 = useFeatureFlag("ENABLE_WORKFLOW_DESIGNER_V2");

	// Workflow tabs
	const [tabs, setTabs] = useState<WorkflowTab[]>([
		{ id: "new-1", name: "New Workflow" },
	]);
	const [activeTabId, setActiveTabId] = useState("new-1");

	// Skill metadata per tab
	const [skillMetadataMap, setSkillMetadataMap] = useState<
		Record<string, SkillMetadata>
	>({});
	const [skillDialogVariant, setSkillDialogVariant] = useState<
		"json" | "variables" | null
	>(null);
	const [skillOption, setSkillOption] = useState<
		"json" | "variables"
	>("json");
	const [runDialogOpen, setRunDialogOpen] = useState(false);
	const [workflowDescriptionMap, setWorkflowDescriptionMap] = useState<
		Record<string, string>
	>({});
	const [publishedSkills, setPublishedSkills] = useState<
		Record<string, SkillMetadata>
	>({});

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
			// Store template description for the active tab
			const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
			if (template) {
				setWorkflowDescriptionMap((prev) => ({
					...prev,
					[activeTabId]: template.description,
				}));
			}
		},
		[setNodes, setEdges, activeTabId],
	);

	const handleLoadTemplate = useCallback(
		(templateId: string) => {
			loadTemplateData(templateId);
		},
		[loadTemplateData],
	);

	const handleSelectStartNode = useCallback(() => {
		const startNode = nodes.find((n) => n.type === "start");
		if (startNode) {
			setSelectedNodeId(startNode.id);
		}
	}, [nodes]);

	const handlePublishSkill = useCallback(
		(metadata: SkillMetadata) => {
			setSkillMetadataMap((prev) => ({
				...prev,
				[activeTabId]: metadata,
			}));
			setPublishedSkills((prev) => {
				const next = { ...prev, [activeTabId]: metadata };
				// Persist for agent builder to pick up
				try {
					const existing = JSON.parse(
						localStorage.getItem("publishedWorkflowSkills") || "[]",
					);
					const filtered = existing.filter(
						(s: { id: string }) => s.id !== activeTabId,
					);
					filtered.push({
						id: activeTabId,
						name: metadata.name,
						description: metadata.description,
					});
					localStorage.setItem(
						"publishedWorkflowSkills",
						JSON.stringify(filtered),
					);
				} catch {
					// ignore
				}
				return next;
			});
			toast.success("Skill published", {
				description: `${metadata.name} is now available in the Agent Builder.`,
			});
		},
		[activeTabId],
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
								{activeTabId === tab.id && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												onClick={(e) => e.stopPropagation()}
												className="p-0.5 hover:bg-slate-200 rounded transition-colors"
												aria-label={`${tab.name} options`}
											>
												<MoreVertical className="w-3 h-3" />
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start" className="w-56">
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation();
													setSkillDialogVariant(skillOption);
												}}
											>
												<Braces className="w-4 h-4 mr-2" />
												Configure as Skill
											</DropdownMenuItem>
											<DropdownMenuItem disabled>
												<FileText className="w-4 h-4 mr-2" />
												Documents
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem disabled>
												<CheckCircle className="w-4 h-4 mr-2" />
												Verify
											</DropdownMenuItem>
											<DropdownMenuItem disabled>
												<History className="w-4 h-4 mr-2" />
												History
											</DropdownMenuItem>
											<DropdownMenuItem disabled>
												<Upload className="w-4 h-4 mr-2" />
												Export
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
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
						<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
						aria-label="Run workflow"
						onClick={() => setRunDialogOpen(true)}
						disabled={nodes.length === 0}
					>
						<Play className="w-4 h-4" />
					</Button>
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
					{isV2 ? (
						<div className="flex flex-col shrink-0 h-full overflow-hidden">
							<div className="h-8 bg-slate-50 border-l border-b border-slate-200 flex items-center px-3 gap-2">
								<span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Skill Modal</span>
								<select
									value={skillOption}
									onChange={(e) => setSkillOption(e.target.value as "json" | "variables")}
									className="text-[11px] h-5 rounded border border-slate-200 bg-white text-slate-600 px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
									aria-label="Skill configuration option"
								>
									<option value="json">Opt 1: JSON Schema</option>
									<option value="variables">Opt 2: Variable Picker</option>
								</select>
							</div>
							<WorkflowConfigPanelV2
								selectedNode={selectedNode}
								onUpdateConfig={handleUpdateConfig}
								onClose={() => setSelectedNodeId(null)}
								onSelectStartNode={handleSelectStartNode}
								nodes={nodes}
								workflowName={tabs.find((t) => t.id === activeTabId)?.name ?? ""}
								workflowDescription={workflowDescriptionMap[activeTabId] ?? ""}
								skillMetadata={skillMetadataMap[activeTabId] ?? DEFAULT_SKILL_METADATA}
								onConfigureSkill={() => setSkillDialogVariant(skillOption)}
								published={activeTabId in publishedSkills}
							/>
						</div>
					) : (
						<WorkflowConfigPanel
							selectedNode={selectedNode}
							onUpdateConfig={handleUpdateConfig}
							onClose={() => setSelectedNodeId(null)}
							onSelectStartNode={handleSelectStartNode}
							nodes={nodes}
						/>
					)}
				</div>
			</div>
			<WorkflowSkillMetadataDialog
				open={skillDialogVariant === "json"}
				onOpenChange={(open) => !open && setSkillDialogVariant(null)}
				value={skillMetadataMap[activeTabId] ?? DEFAULT_SKILL_METADATA}
				onSave={(metadata) =>
					setSkillMetadataMap((prev) => ({
						...prev,
						[activeTabId]: metadata,
					}))
				}
				onPublish={handlePublishSkill}
			/>
			<WorkflowSkillVariableDialog
				open={skillDialogVariant === "variables"}
				onOpenChange={(open) => !open && setSkillDialogVariant(null)}
				value={skillMetadataMap[activeTabId] ?? DEFAULT_SKILL_METADATA}
				onSave={(metadata) =>
					setSkillMetadataMap((prev) => ({
						...prev,
						[activeTabId]: metadata,
					}))
				}
				onPublish={handlePublishSkill}
			/>
			<WorkflowSkillAutoDetectDialog
				open={runDialogOpen}
				onOpenChange={setRunDialogOpen}
				onRun={(variableNames) => {
					toast.success("Workflow execution started");
					// Store detected variables so skill config can pre-populate
					const currentMeta = skillMetadataMap[activeTabId] ?? DEFAULT_SKILL_METADATA;
					if (variableNames.length > 0) {
						const inputs: Record<string, { type: string; description: string; activity: string }> = {};
						for (const name of variableNames) {
							inputs[name] = { type: "string", description: "", activity: "" };
						}
						setSkillMetadataMap((prev) => ({
							...prev,
							[activeTabId]: {
								...currentMeta,
								inputsJson: JSON.stringify(inputs, null, 2),
							},
						}));
					}
				}}
				nodes={nodes}
			/>
		</RitaLayout>
	);
}
