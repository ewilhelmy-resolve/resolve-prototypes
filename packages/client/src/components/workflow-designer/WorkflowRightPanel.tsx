import type { Node } from "@xyflow/react";
import {
	AlertTriangle,
	ChevronsLeft,
	ChevronsRight,
	HelpCircle,
	Info,
	Settings,
	StickyNote,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { WorkflowJarvisChat } from "./WorkflowJarvisChat";
import {
	type StartNodeDetailsState,
	WorkflowStartNodeDetails,
} from "./WorkflowStartNodeDetails";
import type { ActivityConfig, ActivityNodeData } from "./workflowDesignerTypes";
import {
	ACTIVITY_CONFIG_FIELDS,
	ACTIVITY_ICON_MAP,
} from "./workflowDesignerTypes";

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 340;

type RightTab = "jarvis" | "configuration";
type ConfigSubTab = "settings" | "error" | "help" | "notes";

const CONFIG_SUB_TABS: {
	id: ConfigSubTab;
	icon: typeof Settings;
	label: string;
}[] = [
	{ id: "settings", icon: Settings, label: "Settings" },
	{ id: "error", icon: AlertTriangle, label: "Error" },
	{ id: "help", icon: HelpCircle, label: "Help" },
	{ id: "notes", icon: StickyNote, label: "Notes" },
];

interface WorkflowRightPanelProps {
	selectedNode: Node | null;
	onUpdateConfig: (nodeId: string, config: ActivityConfig) => void;
	onClose: () => void;
	onSelectStartNode?: () => void;
	nodes: Node[];
	// Jarvis chat props
	onLoadTemplate: (templateId: string) => void;
	onRenameTab?: (name: string) => void;
	hasWorkflow?: boolean;
	// Start node details state
	startNodeState: StartNodeDetailsState;
	onStartNodeStateChange: (state: StartNodeDetailsState) => void;
	onPublishSkill: () => void;
	workflowName: string;
}

export function WorkflowRightPanel({
	selectedNode,
	onUpdateConfig,
	onClose,
	onSelectStartNode: _onSelectStartNode,
	nodes: _nodes,
	onLoadTemplate,
	onRenameTab,
	hasWorkflow = false,
	startNodeState,
	onStartNodeStateChange,
	onPublishSkill,
	workflowName,
}: WorkflowRightPanelProps) {
	const [activeTab, setActiveTab] = useState<RightTab>("jarvis");
	const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>("settings");
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [collapsed, setCollapsed] = useState(false);
	const isDragging = useRef(false);

	const isStartNode = selectedNode?.type === "start";
	const isActivityNode = selectedNode != null && !isStartNode;

	// Auto-switch to Configuration tab when a node is selected
	useEffect(() => {
		if (selectedNode) {
			setActiveTab("configuration");
			if (isActivityNode) {
				setConfigSubTab("settings");
			}
		}
	}, [selectedNode?.id, isActivityNode, selectedNode]);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			isDragging.current = true;
			const startX = e.clientX;
			const startWidth = width;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				if (!isDragging.current) return;
				const delta = startX - moveEvent.clientX;
				const newWidth = Math.min(
					MAX_WIDTH,
					Math.max(MIN_WIDTH, startWidth + delta),
				);
				setWidth(newWidth);
			};

			const handleMouseUp = () => {
				isDragging.current = false;
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		},
		[width],
	);

	if (collapsed) {
		return (
			<div className="w-8 shrink-0 bg-white border-l border-slate-200 flex flex-col items-center pt-2 shadow-sm">
				<button
					onClick={() => setCollapsed(false)}
					className="p-1 hover:bg-slate-100 rounded transition-colors"
					aria-label="Expand right panel"
				>
					<ChevronsLeft className="w-4 h-4 text-slate-400" />
				</button>
			</div>
		);
	}

	const nodeData = selectedNode
		? (selectedNode.data as unknown as ActivityNodeData)
		: null;
	const Icon =
		nodeData && !isStartNode ? ACTIVITY_ICON_MAP[nodeData.activityType] : null;
	const configFields =
		nodeData && !isStartNode
			? ACTIVITY_CONFIG_FIELDS[nodeData.activityType] || []
			: [];

	const handleFieldChange = (fieldName: string, value: string) => {
		if (!selectedNode || !nodeData) return;
		onUpdateConfig(selectedNode.id, {
			...nodeData.config,
			[fieldName]: value,
		});
	};

	const renderConfigurationContent = () => {
		// Start node selected -> show start node details
		if (isStartNode) {
			return (
				<WorkflowStartNodeDetails
					workflowName={workflowName}
					state={startNodeState}
					onChange={onStartNodeStateChange}
					onPublish={onPublishSkill}
				/>
			);
		}

		// No node selected
		if (!selectedNode) {
			return (
				<div className="flex-1 flex items-center justify-center p-6">
					<div className="text-center">
						<Settings className="w-8 h-8 text-slate-300 mx-auto mb-2" />
						<p className="text-sm text-slate-500">Select a node to configure</p>
					</div>
				</div>
			);
		}

		// Activity node with sub-tabs
		return (
			<>
				{/* Node header */}
				<div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
					<div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white">
						{Icon && <Icon className="w-4 h-4" />}
					</div>
					<div>
						<div className="font-semibold text-sm text-slate-800">
							{nodeData?.label}
						</div>
						<div className="text-xs text-slate-500">{nodeData?.subtitle}</div>
					</div>
				</div>

				{/* Sub-tab row */}
				<div className="flex items-center px-3 py-1 border-b border-slate-200 gap-1 shrink-0">
					{CONFIG_SUB_TABS.map((tab) => {
						const active = configSubTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setConfigSubTab(tab.id)}
								className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
									active
										? "text-blue-600 bg-blue-50"
										: "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
								}`}
								aria-label={tab.label}
								role="tab"
								aria-selected={active}
							>
								<tab.icon className="w-3.5 h-3.5" />
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* Sub-tab content */}
				{configSubTab === "settings" && (
					<>
						<div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex gap-2 shrink-0">
							<Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
							<p className="text-xs text-blue-700 leading-relaxed">
								Used to map data from a previous activity to multiple variables
							</p>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-4 space-y-4">
								<div className="flex items-center justify-between">
									<Label
										htmlFor="rp-advanced-toggle"
										className="text-sm text-slate-600"
									>
										Advanced settings
									</Label>
									<Switch
										id="rp-advanced-toggle"
										checked={showAdvanced}
										onCheckedChange={setShowAdvanced}
									/>
								</div>
								{configFields.length > 0 ? (
									<div className="space-y-3">
										{configFields.map((field) => (
											<div key={field.name}>
												<Label
													htmlFor={`rp-field-${field.name}`}
													className="text-xs font-medium text-slate-600 mb-1.5 block"
												>
													{field.label}
												</Label>
												<Input
													id={`rp-field-${field.name}`}
													type={field.type === "select" ? "text" : field.type}
													value={nodeData?.config[field.name] || ""}
													onChange={(e) =>
														handleFieldChange(field.name, e.target.value)
													}
													placeholder={`Enter ${field.label.toLowerCase()}`}
													className="text-sm h-9"
													aria-label={field.label}
												/>
											</div>
										))}
									</div>
								) : (
									<div className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
										No configurable fields for this activity
									</div>
								)}
								{showAdvanced && (
									<div className="space-y-3 pt-2 border-t border-slate-100">
										<div>
											<Label
												htmlFor="rp-timeout"
												className="text-xs font-medium text-slate-600 mb-1.5 block"
											>
												Timeout (seconds)
											</Label>
											<Input
												id="rp-timeout"
												type="text"
												placeholder="30"
												className="text-sm h-9"
											/>
										</div>
										<div>
											<Label
												htmlFor="rp-retries"
												className="text-xs font-medium text-slate-600 mb-1.5 block"
											>
												Retry count
											</Label>
											<Input
												id="rp-retries"
												type="text"
												placeholder="3"
												className="text-sm h-9"
											/>
										</div>
									</div>
								)}
							</div>
						</ScrollArea>
					</>
				)}
				{configSubTab === "error" && (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">
								Error handling configuration
							</p>
							<p className="text-xs text-slate-400 mt-1">Coming soon</p>
						</div>
					</div>
				)}
				{configSubTab === "help" && (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">Activity documentation</p>
							<p className="text-xs text-slate-400 mt-1">Coming soon</p>
						</div>
					</div>
				)}
				{configSubTab === "notes" && (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">Activity notes</p>
							<p className="text-xs text-slate-400 mt-1">Coming soon</p>
						</div>
					</div>
				)}
			</>
		);
	};

	const showFooter =
		activeTab === "configuration" &&
		isActivityNode &&
		configSubTab === "settings";

	return (
		<div
			className="relative shrink-0 bg-white border-l border-slate-200 flex shadow-sm"
			style={{ width }}
		>
			{/* Drag handle */}
			<div
				aria-hidden="true"
				className="w-1 min-w-[4px] cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors shrink-0"
				onMouseDown={handleMouseDown}
			/>

			{/* Panel content */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Top tabs: Jarvis | Configuration */}
				<div className="flex items-center border-b border-slate-200 shrink-0">
					{(
						[
							{ id: "jarvis", label: "Jarvis" },
							{ id: "configuration", label: "Configuration" },
						] as const
					).map((tab) => {
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								role="tab"
								aria-selected={isActive}
								onClick={() => setActiveTab(tab.id)}
								className={`flex-1 px-2 py-2.5 text-xs font-medium text-center transition-colors border-b-2 ${
									isActive
										? "text-blue-600 border-blue-600"
										: "text-slate-500 border-transparent hover:text-slate-700"
								}`}
								aria-label={`${tab.label} tab`}
							>
								{tab.label}
							</button>
						);
					})}
					<div className="flex items-center pr-1">
						<button
							onClick={() => setCollapsed(true)}
							className="p-1.5 hover:bg-slate-100 rounded transition-colors"
							aria-label="Collapse right panel"
						>
							<ChevronsRight className="w-4 h-4 text-slate-400" />
						</button>
						<button
							onClick={onClose}
							className="p-1.5 hover:bg-slate-100 rounded transition-colors"
							aria-label="Deselect node"
						>
							<X className="w-4 h-4 text-slate-400" />
						</button>
					</div>
				</div>

				{/* Tab content */}
				<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
					{activeTab === "jarvis" && (
						<WorkflowJarvisChat
							onLoadTemplate={onLoadTemplate}
							onRenameTab={onRenameTab}
							hasWorkflow={hasWorkflow}
						/>
					)}
					{activeTab === "configuration" && renderConfigurationContent()}
				</div>

				{/* Footer */}
				{showFooter && (
					<div className="p-3 border-t border-slate-200 flex items-center gap-2 shrink-0">
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={onClose}
						>
							Close
						</Button>
						<Button size="sm" className="flex-1">
							Save
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
