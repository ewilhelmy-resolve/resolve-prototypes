import type { Node } from "@xyflow/react";
import {
	AlertTriangle,
	Braces,
	ChevronDown,
	ChevronsLeft,
	ChevronsRight,
	ChevronUp,
	FileText,
	Globe,
	HelpCircle,
	Info,
	Settings,
	StickyNote,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	ActivityConfig,
	ActivityNodeData,
	TriggerConfig,
	TriggerType,
} from "./workflowDesignerTypes";
import {
	ACTIVITY_CONFIG_FIELDS,
	ACTIVITY_ICON_MAP,
	TRIGGER_CONFIG_FIELDS,
	TRIGGER_TYPE_OPTIONS,
} from "./workflowDesignerTypes";

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

type ActiveTab =
	| "settings"
	| "trigger"
	| "variables"
	| "error"
	| "notes"
	| "help";

const ICON_TABS: {
	id: ActiveTab;
	icon: typeof Settings;
	label: string;
	nodeRequired: boolean;
}[] = [
	{ id: "settings", icon: Settings, label: "Settings", nodeRequired: true },
	{ id: "trigger", icon: Zap, label: "Trigger", nodeRequired: false },
	{ id: "variables", icon: Braces, label: "Variables", nodeRequired: false },
	{ id: "error", icon: AlertTriangle, label: "Error", nodeRequired: true },
	{ id: "notes", icon: StickyNote, label: "Notes", nodeRequired: true },
	{ id: "help", icon: HelpCircle, label: "Help", nodeRequired: true },
];

// Demo global variables for the variables panel
const GLOBAL_VARIABLES = [
	"aaSlack_BaseURL",
	"action",
	"actions_api_token_dev",
	"actions_api_token_prod",
	"actions_api_token_staging",
	"actions_api_url_dev",
	"actions_api_url_prod",
	"actions_api_url_staging",
	"Actions_BaseURL",
	"actions_client_id",
	"actions_grant_type",
	"actions_password",
	"actions_username",
	"ActionsAPI_BaseURL",
	"ActionsNew_BaseURL",
	"ActionsNew_Token",
	"activityListSettings",
	"adServer",
	"ADUserMngt",
	"ADUserMngtPass",
	"Ahola",
	"aiAgentAiPlatformErrorPrefix",
	"aiAgentRetrieveDataWf",
	"aiAgentStoreDataWf",
	"ainiro_service_password",
	"ainirotoken",
	"AlarmID",
	"app_version",
	"AtlassianJira_BaseURL",
	"AtlassianJira_Token",
	"aws_accesskey",
	"aws_secretkey",
];

const REFERENCED_VARIABLES = [
	"actions_api_url_prod",
	"actions_api_token_prod",
	"Actions_BaseURL",
	"adServer",
	"ADUserMngt",
	"ADUserMngtPass",
];

interface WorkflowConfigPanelProps {
	selectedNode: Node | null;
	onUpdateConfig: (nodeId: string, config: ActivityConfig) => void;
	onClose: () => void;
	onSelectStartNode?: () => void;
	nodes: Node[];
}

function VariablesContent() {
	const [workflowOpen, setWorkflowOpen] = useState(false);
	const [globalOpen, setGlobalOpen] = useState(true);

	return (
		<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
			{/* Workflow Variables accordion */}
			<button
				onClick={() => setWorkflowOpen((v) => !v)}
				className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors shrink-0"
			>
				<FileText className="w-4 h-4 text-slate-400" />
				<span className="text-sm font-medium text-slate-700 flex-1 text-left">
					Workflow Variables
				</span>
				{workflowOpen ? (
					<ChevronUp className="w-4 h-4 text-slate-400" />
				) : (
					<ChevronDown className="w-4 h-4 text-slate-400" />
				)}
			</button>
			{workflowOpen && (
				<div className="px-4 pb-2 text-xs text-slate-400 italic">
					No workflow variables defined
				</div>
			)}

			{/* Global Variables accordion */}
			<button
				onClick={() => setGlobalOpen((v) => !v)}
				className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors border-t border-slate-100 shrink-0"
			>
				<Globe className="w-4 h-4 text-slate-400" />
				<span className="text-sm font-medium text-slate-700 flex-1 text-left">
					Global Variables
				</span>
				{globalOpen ? (
					<ChevronUp className="w-4 h-4 text-slate-400" />
				) : (
					<ChevronDown className="w-4 h-4 text-slate-400" />
				)}
			</button>
			{globalOpen && (
				<ScrollArea className="flex-1 min-h-0">
					<div className="px-4 pb-3">
						{REFERENCED_VARIABLES.length > 0 && (
							<>
								<div className="text-xs font-semibold text-slate-700 py-2 border-b border-slate-100">
									Referenced in this Workflow
								</div>
								{REFERENCED_VARIABLES.map((v) => (
									<div
										key={`ref-${v}`}
										className="py-1.5 text-sm text-slate-600 border-b border-slate-50"
									>
										{v}
									</div>
								))}
							</>
						)}
						<div className="text-xs font-semibold text-slate-700 py-2 mt-2 border-b border-slate-100">
							All Global Variables
						</div>
						{GLOBAL_VARIABLES.map((v) => (
							<div
								key={v}
								className="py-1.5 text-sm text-slate-600 border-b border-slate-50"
							>
								{v}
							</div>
						))}
					</div>
				</ScrollArea>
			)}
		</div>
	);
}

export function WorkflowConfigPanel({
	selectedNode,
	onUpdateConfig,
	onClose,
	onSelectStartNode,
	nodes: _nodes,
}: WorkflowConfigPanelProps) {
	const [activeTab, setActiveTab] = useState<ActiveTab>("variables");
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [collapsed, setCollapsed] = useState(false);
	const isDragging = useRef(false);

	const isStartNode = selectedNode?.type === "start";
	const isActivityNode = selectedNode != null && !isStartNode;

	// Auto-switch tab on node selection change
	useEffect(() => {
		if (isStartNode) {
			setActiveTab("trigger");
		} else if (isActivityNode) {
			// Switch to settings unless already on variables
			setActiveTab((prev) => (prev === "variables" ? prev : "settings"));
		} else {
			// No node — default to variables or trigger
			setActiveTab((prev) =>
				prev === "trigger" || prev === "variables" ? prev : "variables",
			);
		}
	}, [selectedNode?.id, isStartNode, isActivityNode]);

	// Determine which tabs are disabled
	// Start node: only trigger + variables enabled
	// Activity node: all enabled
	// No node: only trigger + variables enabled

	const isTabDisabled = (tab: (typeof ICON_TABS)[0]) => {
		if (!tab.nodeRequired) return false;
		if (isStartNode) return true;
		return !selectedNode;
	};

	const handleTabClick = (tab: (typeof ICON_TABS)[0]) => {
		if (isTabDisabled(tab)) return;

		if (tab.id === "trigger" && !selectedNode) {
			// Auto-select start node when clicking trigger with no node
			onSelectStartNode?.();
			setActiveTab("trigger");
			return;
		}

		setActiveTab(tab.id);
	};

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
					aria-label="Expand config panel"
				>
					<ChevronsLeft className="w-4 h-4 text-slate-400" />
				</button>
			</div>
		);
	}

	// Derive node data
	const nodeData = selectedNode
		? (selectedNode.data as unknown as ActivityNodeData)
		: null;
	const Icon =
		nodeData && !isStartNode ? ACTIVITY_ICON_MAP[nodeData.activityType] : null;
	const configFields =
		nodeData && !isStartNode
			? ACTIVITY_CONFIG_FIELDS[nodeData.activityType] || []
			: [];

	// Trigger config
	const triggerConfig = nodeData?.config as unknown as TriggerConfig;
	const currentTriggerType: TriggerType =
		(triggerConfig?.triggerType as TriggerType) || "manual";
	const triggerFields = TRIGGER_CONFIG_FIELDS[currentTriggerType] || [];

	const handleFieldChange = (fieldName: string, value: string) => {
		if (!selectedNode || !nodeData) return;
		onUpdateConfig(selectedNode.id, {
			...nodeData.config,
			[fieldName]: value,
		});
	};

	const handleTriggerTypeChange = (type: TriggerType) => {
		if (!selectedNode) return;
		const base: ActivityConfig = { triggerType: type };
		if (type === "webhook") {
			base.webhookUrl = `https://api.resolve.io/hooks/${crypto.randomUUID().slice(0, 8)}`;
			base.webhookSecret = `whsec_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
		}
		if (type === "schedule") {
			base.interval = "15m";
		}
		onUpdateConfig(selectedNode.id, base);
	};

	const showFooter = activeTab === "settings" || activeTab === "trigger";

	const renderContent = () => {
		switch (activeTab) {
			case "settings":
				return (
					<>
						{/* Info banner */}
						<div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex gap-2">
							<Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
							<p className="text-xs text-blue-700 leading-relaxed">
								Used to map data from a previous activity to multiple variables
							</p>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-4 space-y-4">
								{/* Activity header */}
								<div className="flex items-center gap-3 pb-3 border-b border-slate-100">
									<div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white">
										{Icon && <Icon className="w-4 h-4" />}
									</div>
									<div>
										<div className="font-semibold text-sm text-slate-800">
											{nodeData?.label}
										</div>
										<div className="text-xs text-slate-500">
											{nodeData?.subtitle}
										</div>
									</div>
								</div>

								{/* Advanced settings toggle */}
								<div className="flex items-center justify-between">
									<Label
										htmlFor="advanced-toggle"
										className="text-sm text-slate-600"
									>
										Advanced settings
									</Label>
									<Switch
										id="advanced-toggle"
										checked={showAdvanced}
										onCheckedChange={setShowAdvanced}
									/>
								</div>

								{/* Dynamic config fields */}
								{configFields.length > 0 ? (
									<div className="space-y-3">
										{configFields.map((field) => (
											<div key={field.name}>
												<Label
													htmlFor={`field-${field.name}`}
													className="text-xs font-medium text-slate-600 mb-1.5 block"
												>
													{field.label}
												</Label>
												<Input
													id={`field-${field.name}`}
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

								{/* Advanced fields */}
								{showAdvanced && (
									<div className="space-y-3 pt-2 border-t border-slate-100">
										<div>
											<Label
												htmlFor="timeout"
												className="text-xs font-medium text-slate-600 mb-1.5 block"
											>
												Timeout (seconds)
											</Label>
											<Input
												id="timeout"
												type="text"
												placeholder="30"
												className="text-sm h-9"
											/>
										</div>
										<div>
											<Label
												htmlFor="retries"
												className="text-xs font-medium text-slate-600 mb-1.5 block"
											>
												Retry count
											</Label>
											<Input
												id="retries"
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
				);

			case "trigger":
				return (
					<>
						{/* Green info banner */}
						<div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex gap-2">
							<Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
							<p className="text-xs text-emerald-700 leading-relaxed">
								Configure how this workflow is triggered
							</p>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-4 space-y-4">
								{/* Start node header */}
								<div className="flex items-center gap-3 pb-3 border-b border-slate-100">
									<div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
										<Settings className="w-4 h-4" />
									</div>
									<div>
										<div className="font-semibold text-sm text-slate-800">
											Trigger
										</div>
										<div className="text-xs text-slate-500">
											Start node configuration
										</div>
									</div>
								</div>

								{/* 2x2 trigger type selector */}
								<div>
									<Label className="text-xs font-medium text-slate-600 mb-2 block">
										Trigger Type
									</Label>
									<div className="grid grid-cols-2 gap-2">
										{TRIGGER_TYPE_OPTIONS.map((opt) => {
											const isActive = currentTriggerType === opt.value;
											return (
												<button
													key={opt.value}
													onClick={() => handleTriggerTypeChange(opt.value)}
													className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
														isActive
															? "border-emerald-500 bg-emerald-50 text-emerald-700"
															: "border-slate-200 hover:border-slate-300 text-slate-600"
													}`}
													aria-label={`Trigger type: ${opt.label}`}
												>
													<opt.icon
														className={`w-5 h-5 ${isActive ? "text-emerald-500" : "text-slate-400"}`}
													/>
													<span className="text-xs font-medium">
														{opt.label}
													</span>
												</button>
											);
										})}
									</div>
								</div>

								{/* Dynamic trigger config fields */}
								{triggerFields.length > 0 && (
									<div className="space-y-3">
										{triggerFields.map((field) => {
											if (
												field.name === "cron" &&
												nodeData?.config.interval !== "custom"
											) {
												return null;
											}

											if (field.type === "select" && field.options) {
												return (
													<div key={field.name}>
														<Label
															htmlFor={`trigger-${field.name}`}
															className="text-xs font-medium text-slate-600 mb-1.5 block"
														>
															{field.label}
														</Label>
														<select
															id={`trigger-${field.name}`}
															value={nodeData?.config[field.name] || ""}
															onChange={(e) =>
																handleFieldChange(field.name, e.target.value)
															}
															className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
															aria-label={field.label}
														>
															<option value="">Select...</option>
															{field.options.map((opt) => (
																<option key={opt.value} value={opt.value}>
																	{opt.label}
																</option>
															))}
														</select>
													</div>
												);
											}

											return (
												<div key={field.name}>
													<Label
														htmlFor={`trigger-${field.name}`}
														className="text-xs font-medium text-slate-600 mb-1.5 block"
													>
														{field.label}
													</Label>
													<Input
														id={`trigger-${field.name}`}
														type={field.type === "select" ? "text" : field.type}
														value={nodeData?.config[field.name] || ""}
														onChange={(e) =>
															handleFieldChange(field.name, e.target.value)
														}
														placeholder={`Enter ${field.label.toLowerCase()}`}
														className="text-sm h-9"
														aria-label={field.label}
														readOnly={
															field.name === "webhookUrl" ||
															field.name === "webhookSecret"
														}
													/>
												</div>
											);
										})}
									</div>
								)}

								{currentTriggerType === "manual" && (
									<div className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
										Manual trigger — no additional configuration needed
									</div>
								)}
							</div>
						</ScrollArea>
					</>
				);

			case "variables":
				return <VariablesContent />;

			case "error":
				return (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">
								Error handling configuration
							</p>
							<p className="text-xs text-slate-400 mt-1">Coming soon</p>
						</div>
					</div>
				);

			case "help":
				return (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">Activity documentation</p>
							<p className="text-xs text-slate-400 mt-1">Coming soon</p>
						</div>
					</div>
				);

			case "notes":
				return (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">Activity notes</p>
							<p className="text-xs text-slate-400 mt-1">Coming soon</p>
						</div>
					</div>
				);
		}
	};

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
				{/* Icon tab bar */}
				<div className="flex items-center px-2 py-1.5 border-b border-slate-200 gap-0.5">
					{ICON_TABS.map((tab) => {
						const disabled = isTabDisabled(tab);
						const active = activeTab === tab.id;
						return (
							<Tooltip key={tab.id}>
								<TooltipTrigger asChild>
									<button
										onClick={() => handleTabClick(tab)}
										disabled={disabled}
										className={`relative p-2 rounded transition-colors ${
											disabled
												? "text-slate-300 cursor-not-allowed"
												: active
													? "text-blue-600 bg-blue-50"
													: "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
										}`}
										aria-label={tab.label}
									>
										<tab.icon className="w-4 h-4" />
										{active && (
											<div className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-600 rounded-full" />
										)}
									</button>
								</TooltipTrigger>
								<TooltipContent side="bottom">{tab.label}</TooltipContent>
							</Tooltip>
						);
					})}

					<div className="flex-1" />

					<button
						onClick={() => setCollapsed(true)}
						className="p-1.5 hover:bg-slate-100 rounded transition-colors"
						aria-label="Collapse config panel"
					>
						<ChevronsRight className="w-4 h-4 text-slate-400" />
					</button>
					<button
						onClick={onClose}
						className="p-1.5 hover:bg-slate-100 rounded transition-colors"
						aria-label="Close config panel"
					>
						<X className="w-4 h-4 text-slate-400" />
					</button>
				</div>

				{/* Tab content */}
				<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
					{renderContent()}
				</div>

				{/* Footer — settings and trigger only */}
				{showFooter && (
					<div className="p-3 border-t border-slate-200 flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={onClose}
						>
							Cancel
						</Button>
						{activeTab === "settings" && (
							<Button variant="outline" size="sm" className="flex-1">
								Test
							</Button>
						)}
						<Button size="sm" className="flex-1">
							Save
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
