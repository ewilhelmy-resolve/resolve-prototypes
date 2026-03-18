import type { Node } from "@xyflow/react";
import {
	AlertTriangle,
	Braces,
	ChevronDown,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	ChevronUp,
	Globe,
	HelpCircle,
	Info,
	Settings,
	StickyNote,
	Wrench,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import type {
	ActivityConfig,
	ActivityNodeData,
	SkillMetadata,
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

type TopTab = "details" | "config" | "variables";
type SubTab = "settings" | "error" | "help" | "notes";

// Demo global variables (duplicated to avoid modifying V1)
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

interface WorkflowConfigPanelV2Props {
	selectedNode: Node | null;
	onUpdateConfig: (nodeId: string, config: ActivityConfig) => void;
	onClose: () => void;
	onSelectStartNode?: () => void;
	nodes: Node[];
	workflowName: string;
	skillMetadata: SkillMetadata;
	onConfigureSkill: () => void;
	published: boolean;
}

/* ─── Details Tab ─── */

const MOCK_VERSION_HISTORY = [
	{ version: "v1.4", date: "2026-02-28 14:32", author: "Shubham Wagdarkar", message: "Added Slack fallback channel", changes: 2, current: true },
	{ version: "v1.3", date: "2026-02-14 09:15", author: "Ari Cohen", message: "Enabled verbose debug mode", changes: 1, current: false },
	{ version: "v1.2", date: "2026-01-30 17:00", author: "Shubham Wagdarkar", message: "Added JSON parser strict mode", changes: 1, current: false },
	{ version: "v1.1", date: "2025-12-20 11:45", author: "Andres Morales", message: "Initial Jira platform support", changes: 2, current: false },
];

function DetailsContent({
	workflowName,
	skillMetadata,
	onConfigureSkill,
	published,
}: {
	workflowName: string;
	skillMetadata: SkillMetadata;
	onConfigureSkill: () => void;
	published: boolean;
}) {
	const [descOpen, setDescOpen] = useState(true);
	const [skillOpen, setSkillOpen] = useState(true);
	const [versionOpen, setVersionOpen] = useState(false);

	const isSkillConfigured = skillMetadata.name.trim() !== "";

	return (
		<ScrollArea className="flex-1">
			<div className="p-4 space-y-0">
				{/* Workflow heading */}
				<div className="text-base font-semibold text-slate-800 mb-1">
					{workflowName || "New Workflow"}
				</div>
				<div className="flex items-center gap-2 mb-3">
					{published ? (
						<span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">
							Published
						</span>
					) : (
						<span className="text-[10px] font-medium bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">
							Draft
						</span>
					)}
					<span className="text-xs text-slate-400">Owner: You</span>
				</div>

				{/* Description */}
				<button
					onClick={() => setDescOpen((v) => !v)}
					className="flex items-center justify-between w-full py-2 border-t border-slate-200"
				>
					<span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
						Description
					</span>
					{descOpen ? (
						<ChevronUp className="w-3.5 h-3.5 text-slate-400" />
					) : (
						<ChevronDown className="w-3.5 h-3.5 text-slate-400" />
					)}
				</button>
				{descOpen && (
					<p className="text-xs text-slate-500 leading-relaxed mb-2">
						{skillMetadata.description || (
							<span className="italic text-slate-400">No description</span>
						)}
					</p>
				)}

				{/* Skill Configuration */}
				<button
					onClick={() => setSkillOpen((v) => !v)}
					className="flex items-center justify-between w-full py-2 border-t border-slate-200"
				>
					<span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
						Skill Configuration
					</span>
					{skillOpen ? (
						<ChevronUp className="w-3.5 h-3.5 text-slate-400" />
					) : (
						<ChevronRight className="w-3.5 h-3.5 text-slate-400" />
					)}
				</button>
				{skillOpen && (
					<div className="mb-2">
						{isSkillConfigured ? (
							<div className="space-y-2.5">
								<div>
									<div className="text-[10px] text-slate-400 uppercase tracking-wider">
										Skill Name
									</div>
									<div className="text-sm text-slate-700">
										{skillMetadata.name}
									</div>
								</div>
								{skillMetadata.description && (
									<div>
										<div className="text-[10px] text-slate-400 uppercase tracking-wider">
											Description
										</div>
										<div className="text-xs text-slate-600">
											{skillMetadata.description}
										</div>
									</div>
								)}
								{skillMetadata.toolEid && (
									<div>
										<div className="text-[10px] text-slate-400 uppercase tracking-wider">
											Tool EID
										</div>
										<div className="text-xs font-mono text-slate-600">
											{skillMetadata.toolEid}
										</div>
									</div>
								)}
								{skillMetadata.inputsJson && (
									<div>
										<div className="text-[10px] text-slate-400 uppercase tracking-wider">
											Inputs
										</div>
										<pre className="text-[10px] font-mono text-slate-500 bg-slate-50 rounded p-2 overflow-x-auto max-h-[80px]">
											{skillMetadata.inputsJson}
										</pre>
									</div>
								)}
								{skillMetadata.outputsJson && (
									<div>
										<div className="text-[10px] text-slate-400 uppercase tracking-wider">
											Outputs
										</div>
										<pre className="text-[10px] font-mono text-slate-500 bg-slate-50 rounded p-2 overflow-x-auto max-h-[80px]">
											{skillMetadata.outputsJson}
										</pre>
									</div>
								)}
								<div className="pt-1">
									<Button
										variant="outline"
										size="sm"
										className="text-xs h-7"
										onClick={() => onConfigureSkill()}
									>
										<Settings className="w-3 h-3 mr-1" />
										Edit
									</Button>
								</div>
							</div>
						) : (
							<div className="text-center py-4 border border-dashed border-slate-200 rounded-lg">
								<Wrench className="w-6 h-6 text-slate-300 mx-auto mb-2" />
								<p className="text-xs text-slate-400 mb-3">
									Not configured as a skill
								</p>
								<Button
									size="sm"
									className="text-xs h-7"
									onClick={() => onConfigureSkill()}
								>
									Configure
								</Button>
							</div>
						)}
					</div>
				)}

				{/* Version History */}
				<button
					onClick={() => setVersionOpen((v) => !v)}
					className="flex items-center justify-between w-full py-2 border-t border-slate-200"
				>
					<span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
						Version History
					</span>
					{versionOpen ? (
						<ChevronUp className="w-3.5 h-3.5 text-slate-400" />
					) : (
						<ChevronDown className="w-3.5 h-3.5 text-slate-400" />
					)}
				</button>
				{versionOpen && (
					<div className="space-y-3 mb-2">
						{MOCK_VERSION_HISTORY.map((v) => (
							<div key={v.version} className="flex gap-2">
								<span
									className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
										v.current
											? "bg-emerald-100 text-emerald-700"
											: "bg-slate-100 text-slate-500"
									}`}
								>
									{v.version}
								</span>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-[10px] text-slate-400">{v.date}</span>
										{v.current && (
											<span className="text-[10px] font-medium text-emerald-600">Current</span>
										)}
										{!v.current && (
											<button
												type="button"
												className="text-[10px] text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-1.5 py-0.5"
											>
												Restore
											</button>
										)}
									</div>
									<div className="text-xs text-slate-600">{v.author}</div>
									<div className="text-xs text-slate-500 italic">
										&ldquo;{v.message}&rdquo;
									</div>
									<div className="text-[10px] text-slate-400">
										&gt; {v.changes} change{v.changes > 1 ? "s" : ""}
									</div>
								</div>
							</div>
						))}
					</div>
				)}

			</div>
		</ScrollArea>
	);
}

/* ─── Variables Tab ─── */
function VariablesContent() {
	const [workflowOpen, setWorkflowOpen] = useState(false);
	const [globalOpen, setGlobalOpen] = useState(true);

	return (
		<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
			<button
				onClick={() => setWorkflowOpen((v) => !v)}
				className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors shrink-0"
			>
				<Braces className="w-4 h-4 text-slate-400" />
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
				<div className="px-4 pb-3 text-xs text-slate-400 italic">
					No workflow-level variables defined yet.
				</div>
			)}

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

/* ─── Node Sub-tabs ─── */
const SUB_TABS: { id: SubTab; icon: typeof Settings; label: string }[] = [
	{ id: "settings", icon: Settings, label: "Settings" },
	{ id: "error", icon: AlertTriangle, label: "Error" },
	{ id: "help", icon: HelpCircle, label: "Help" },
	{ id: "notes", icon: StickyNote, label: "Notes" },
];

/* ─── Main Panel ─── */
export function WorkflowConfigPanelV2({
	selectedNode,
	onUpdateConfig,
	onClose,
	onSelectStartNode: _onSelectStartNode,
	nodes: _nodes,
	workflowName,
	skillMetadata,
	onConfigureSkill,
	published,
}: WorkflowConfigPanelV2Props) {
	const [topTab, setTopTab] = useState<TopTab>("details");
	const [subTab, setSubTab] = useState<SubTab>("settings");
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [collapsed, setCollapsed] = useState(false);
	const isDragging = useRef(false);

	const isStartNode = selectedNode?.type === "start";
	const isActivityNode = selectedNode != null && !isStartNode;

	// Auto-switch on node selection
	useEffect(() => {
		if (isStartNode) {
			setTopTab("details");
		} else if (isActivityNode) {
			setTopTab("config");
			setSubTab("settings");
		}
	}, [selectedNode?.id, isStartNode, isActivityNode]);

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

	const nodeData = selectedNode
		? (selectedNode.data as unknown as ActivityNodeData)
		: null;
	const Icon =
		nodeData && !isStartNode
			? ACTIVITY_ICON_MAP[nodeData.activityType]
			: null;
	const configFields =
		nodeData && !isStartNode
			? (ACTIVITY_CONFIG_FIELDS[nodeData.activityType] || [])
			: [];

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

	const renderConfigContent = () => {
		// Start node trigger config
		if (isStartNode) {
			return (
				<>
					<div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex gap-2">
						<Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
						<p className="text-xs text-emerald-700 leading-relaxed">
							Configure how this workflow is triggered
						</p>
					</div>
					<ScrollArea className="flex-1">
						<div className="p-4 space-y-4">
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
							<div>
								<Label className="text-xs font-medium text-slate-600 mb-2 block">
									Trigger Type
								</Label>
								<div className="grid grid-cols-2 gap-2">
									{TRIGGER_TYPE_OPTIONS.map((opt) => {
										const isActive =
											currentTriggerType === opt.value;
										return (
											<button
												key={opt.value}
												onClick={() =>
													handleTriggerTypeChange(
														opt.value,
													)
												}
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
							{triggerFields.length > 0 && (
								<div className="space-y-3">
									{triggerFields.map((field) => {
										if (
											field.name === "cron" &&
											nodeData?.config.interval !==
												"custom"
										) {
											return null;
										}
										if (
											field.type === "select" &&
											field.options
										) {
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
														value={
															nodeData?.config[
																field.name
															] || ""
														}
														onChange={(e) =>
															handleFieldChange(
																field.name,
																e.target.value,
															)
														}
														className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
														aria-label={
															field.label
														}
													>
														<option value="">
															Select...
														</option>
														{field.options.map(
															(opt) => (
																<option
																	key={
																		opt.value
																	}
																	value={
																		opt.value
																	}
																>
																	{opt.label}
																</option>
															),
														)}
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
													type={
														field.type === "select"
															? "text"
															: field.type
													}
													value={
														nodeData?.config[
															field.name
														] || ""
													}
													onChange={(e) =>
														handleFieldChange(
															field.name,
															e.target.value,
														)
													}
													placeholder={`Enter ${field.label.toLowerCase()}`}
													className="text-sm h-9"
													aria-label={field.label}
													readOnly={
														field.name ===
															"webhookUrl" ||
														field.name ===
															"webhookSecret"
													}
												/>
											</div>
										);
									})}
								</div>
							)}
							{currentTriggerType === "manual" && (
								<div className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
									Manual trigger — no additional configuration
									needed
								</div>
							)}
						</div>
					</ScrollArea>
				</>
			);
		}

		// No node selected
		if (!selectedNode) {
			return (
				<div className="flex-1 flex items-center justify-center p-6">
					<div className="text-center">
						<Settings className="w-8 h-8 text-slate-300 mx-auto mb-2" />
						<p className="text-sm text-slate-500">
							Select a node to configure
						</p>
					</div>
				</div>
			);
		}

		// Activity node with sub-tabs
		return (
			<>
				{/* Node header */}
				<div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
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

				{/* Sub-tab row */}
				<div className="flex items-center px-3 py-1 border-b border-slate-200 gap-1">
					{SUB_TABS.map((tab) => {
						const active = subTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setSubTab(tab.id)}
								className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
									active
										? "text-blue-600 bg-blue-50"
										: "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
								}`}
								aria-label={tab.label}
							>
								<tab.icon className="w-3.5 h-3.5" />
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* Sub-tab content */}
				{subTab === "settings" && (
					<>
						<div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex gap-2">
							<Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
							<p className="text-xs text-blue-700 leading-relaxed">
								Used to map data from a previous activity to
								multiple variables
							</p>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-4 space-y-4">
								<div className="flex items-center justify-between">
									<Label
										htmlFor="v2-advanced-toggle"
										className="text-sm text-slate-600"
									>
										Advanced settings
									</Label>
									<Switch
										id="v2-advanced-toggle"
										checked={showAdvanced}
										onCheckedChange={setShowAdvanced}
									/>
								</div>
								{configFields.length > 0 ? (
									<div className="space-y-3">
										{configFields.map((field) => (
											<div key={field.name}>
												<Label
													htmlFor={`v2-field-${field.name}`}
													className="text-xs font-medium text-slate-600 mb-1.5 block"
												>
													{field.label}
												</Label>
												<Input
													id={`v2-field-${field.name}`}
													type={
														field.type === "select"
															? "text"
															: field.type
													}
													value={
														nodeData?.config[
															field.name
														] || ""
													}
													onChange={(e) =>
														handleFieldChange(
															field.name,
															e.target.value,
														)
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
												htmlFor="v2-timeout"
												className="text-xs font-medium text-slate-600 mb-1.5 block"
											>
												Timeout (seconds)
											</Label>
											<Input
												id="v2-timeout"
												type="text"
												placeholder="30"
												className="text-sm h-9"
											/>
										</div>
										<div>
											<Label
												htmlFor="v2-retries"
												className="text-xs font-medium text-slate-600 mb-1.5 block"
											>
												Retry count
											</Label>
											<Input
												id="v2-retries"
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
				{subTab === "error" && (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">
								Error handling configuration
							</p>
							<p className="text-xs text-slate-400 mt-1">
								Coming soon
							</p>
						</div>
					</div>
				)}
				{subTab === "help" && (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">
								Activity documentation
							</p>
							<p className="text-xs text-slate-400 mt-1">
								Coming soon
							</p>
						</div>
					</div>
				)}
				{subTab === "notes" && (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="text-center">
							<StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
							<p className="text-sm text-slate-500">
								Activity notes
							</p>
							<p className="text-xs text-slate-400 mt-1">
								Coming soon
							</p>
						</div>
					</div>
				)}
			</>
		);
	};

	const hasNodeSelected = isStartNode || isActivityNode;

	const showFooter =
		topTab === "config" &&
		hasNodeSelected &&
		subTab === "settings";

	return (
		<div
			className="relative shrink-0 flex-1 bg-white border-l border-slate-200 flex shadow-sm"
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
				{/* Top tabs: Config | Variables */}
				<div className="flex items-center border-b border-slate-200">
					{(
						[
							{ id: "details", label: "Details" },
							{ id: "config", label: "Config" },
							{ id: "variables", label: "Variables" },
						] as const
					).map((tab) => {
						const isActive = topTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setTopTab(tab.id)}
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
				</div>

				{/* Tab content */}
				<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
					{topTab === "details" && <DetailsContent workflowName={workflowName} skillMetadata={skillMetadata} onConfigureSkill={onConfigureSkill} published={published} />}
					{topTab === "config" && renderConfigContent()}
					{topTab === "variables" && <VariablesContent />}
				</div>

				{/* Footer */}
				{showFooter && (
					<div className="p-3 border-t border-slate-200 flex items-center gap-2">
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
