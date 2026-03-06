import type { Node } from "@xyflow/react";
import {
	AlertTriangle,
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
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActivityConfig, ActivityNodeData } from "./workflowDesignerTypes";
import {
	ACTIVITY_CONFIG_FIELDS,
	ACTIVITY_ICON_MAP,
} from "./workflowDesignerTypes";

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

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
}: WorkflowConfigPanelProps) {
	const [topTab, setTopTab] = useState<"config" | "variables">(
		selectedNode ? "config" : "variables",
	);
	const [configSubTab, setConfigSubTab] = useState<
		"settings" | "error" | "help" | "notes"
	>("settings");
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [collapsed, setCollapsed] = useState(false);
	const isDragging = useRef(false);

	// Switch to config when a node is selected, variables when deselected
	useEffect(() => {
		setTopTab(selectedNode ? "config" : "variables");
	}, [selectedNode]);

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

	// No node selected — show Variables tab
	if (!selectedNode) {
		return (
			<div
				className="shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-sm min-h-0 overflow-hidden"
				style={{ width }}
			>
				{/* Drag handle */}
				<div
					aria-hidden="true"
					className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors z-10"
					onMouseDown={handleMouseDown}
					style={{ position: "relative", width: 4, minWidth: 4, flexShrink: 0 }}
				/>
				<div
					className="flex-1 flex flex-col min-h-0"
					style={{ marginLeft: -4 }}
				>
					<div className="flex items-center px-[9px] py-[8px] border-b border-[#e5e7eb] shrink-0">
						<div className="rounded-t-[3px] px-[11px] h-[28px] flex items-center justify-center border border-b-0 bg-white text-[#374151] border-white">
							<span
								className="text-[12px] font-semibold leading-[18px]"
								style={{ fontFamily: "'Open Sans', sans-serif" }}
							>
								Config
							</span>
						</div>
						<div className="rounded-t-[3px] px-[11px] h-[28px] flex items-center justify-center border border-b-0 bg-[#e5e7eb] text-[#011331] border-[#e5e7eb]">
							<span
								className="text-[12px] font-semibold leading-[18px]"
								style={{ fontFamily: "'Open Sans', sans-serif" }}
							>
								Variables
							</span>
						</div>
						<div className="flex-1 flex items-center justify-end">
							<button
								onClick={() => setCollapsed(true)}
								className="p-1 hover:bg-slate-100 rounded transition-colors"
								aria-label="Collapse config panel"
							>
								<ChevronsRight className="w-4 h-4 text-[#374151]" />
							</button>
						</div>
					</div>
					<VariablesContent />
				</div>
			</div>
		);
	}

	const nodeData = selectedNode.data as unknown as ActivityNodeData;
	const Icon = ACTIVITY_ICON_MAP[nodeData.activityType];
	const configFields = ACTIVITY_CONFIG_FIELDS[nodeData.activityType] || [];

	const handleFieldChange = (fieldName: string, value: string) => {
		onUpdateConfig(selectedNode.id, {
			...nodeData.config,
			[fieldName]: value,
		});
	};

	return (
		<div
			className="relative shrink-0 bg-white border-l border-slate-200 flex shadow-sm"
			style={{ width }}
		>
			{/* Drag handle on left edge */}
			<div
				aria-hidden="true"
				className="w-1 min-w-[4px] cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors shrink-0"
				onMouseDown={handleMouseDown}
			/>

			{/* Panel content */}
			<div className="flex-1 flex flex-col min-w-0">
				<Tabs
					value={topTab}
					onValueChange={(v) => setTopTab(v as "config" | "variables")}
					className="flex-1 flex flex-col"
				>
					<div className="flex items-center px-[9px] py-[8px] border-b border-[#e5e7eb]">
						<TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
							<TabsTrigger
								value="config"
								className="rounded-t-[3px] rounded-b-none px-[11px] h-[28px] text-[12px] font-semibold leading-[18px] border border-b-0 data-[state=active]:bg-[#e5e7eb] data-[state=active]:text-[#011331] data-[state=active]:border-[#e5e7eb] data-[state=active]:shadow-none data-[state=inactive]:bg-white data-[state=inactive]:text-[#374151] data-[state=inactive]:border-white"
								style={{ fontFamily: "'Open Sans', sans-serif" }}
							>
								Config
							</TabsTrigger>
							<TabsTrigger
								value="variables"
								className="rounded-t-[3px] rounded-b-none px-[11px] h-[28px] text-[12px] font-semibold leading-[18px] border border-b-0 data-[state=active]:bg-[#e5e7eb] data-[state=active]:text-[#011331] data-[state=active]:border-[#e5e7eb] data-[state=active]:shadow-none data-[state=inactive]:bg-white data-[state=inactive]:text-[#374151] data-[state=inactive]:border-white"
								style={{ fontFamily: "'Open Sans', sans-serif" }}
							>
								Variables
							</TabsTrigger>
						</TabsList>
						<div className="flex-1 flex items-center justify-end gap-1">
							<button
								onClick={() => setCollapsed(true)}
								className="p-1 hover:bg-slate-100 rounded transition-colors"
								aria-label="Collapse config panel"
							>
								<ChevronsRight className="w-4 h-4 text-[#374151]" />
							</button>
							<button
								onClick={onClose}
								className="p-1 hover:bg-slate-100 rounded transition-colors"
								aria-label="Close config panel"
							>
								<X className="w-4 h-4 text-[#374151]" />
							</button>
						</div>
					</div>

					{/* Config Tab */}
					<TabsContent value="config" className="flex-1 flex flex-col mt-0 p-0">
						{/* Info banner */}
						<div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex gap-2">
							<Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
							<p className="text-xs text-blue-700 leading-relaxed">
								Used to map data from a previous activity to multiple variables
							</p>
						</div>

						{/* Sub-tabs: Settings | Error | Help | Notes */}
						<div className="border-b border-slate-200 px-2">
							<div className="flex gap-1">
								{(
									[
										{ id: "settings", icon: Settings, label: "Settings" },
										{ id: "error", icon: AlertTriangle, label: "Error" },
										{ id: "help", icon: HelpCircle, label: "Help" },
										{ id: "notes", icon: StickyNote, label: "Notes" },
									] as const
								).map((tab) => (
									<button
										key={tab.id}
										onClick={() => setConfigSubTab(tab.id)}
										className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-b-2 ${
											configSubTab === tab.id
												? "border-blue-500 text-blue-600"
												: "border-transparent text-slate-500 hover:text-slate-700"
										}`}
									>
										<tab.icon className="w-3 h-3" />
										{tab.label}
									</button>
								))}
							</div>
						</div>

						{/* Settings sub-tab content */}
						{configSubTab === "settings" && (
							<ScrollArea className="flex-1">
								<div className="p-4 space-y-4">
									{/* Activity header */}
									<div className="flex items-center gap-3 pb-3 border-b border-slate-100">
										<div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white">
											<Icon className="w-4 h-4" />
										</div>
										<div>
											<div className="font-semibold text-sm text-slate-800">
												{nodeData.label}
											</div>
											<div className="text-xs text-slate-500">
												{nodeData.subtitle}
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
														type={field.type}
														value={nodeData.config[field.name] || ""}
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
						)}

						{/* Other sub-tab placeholders */}
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
									<p className="text-sm text-slate-500">
										Activity documentation
									</p>
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

						{/* Footer buttons */}
						<div className="p-3 border-t border-slate-200 flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={onClose}
							>
								Cancel
							</Button>
							<Button variant="outline" size="sm" className="flex-1">
								Test
							</Button>
							<Button size="sm" className="flex-1">
								Save
							</Button>
						</div>
					</TabsContent>

					{/* Variables Tab */}
					<TabsContent
						value="variables"
						className="flex-1 flex flex-col mt-0 p-0 min-h-0 overflow-hidden"
					>
						<VariablesContent />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
