import {
	ChevronsLeft,
	ChevronsRight,
	FileText,
	GripVertical,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowVariablesPanel } from "./WorkflowVariablesPanel";
import { TOOLBOX_ITEMS, WORKFLOW_TEMPLATES } from "./workflowDesignerData";
import { ACTIVITY_ICON_MAP } from "./workflowDesignerTypes";

interface WorkflowJarvisPanelProps {
	onLoadTemplate: (templateId: string) => void;
	onRenameTab?: (name: string) => void;
	hasWorkflow?: boolean;
}

const TAB_TRIGGER_CLASS =
	"rounded-t-[3px] rounded-b-none px-[11px] h-[28px] text-[12px] font-semibold leading-[18px] border border-b-0 data-[state=active]:bg-[#e5e7eb] data-[state=active]:text-[#011331] data-[state=active]:border-[#e5e7eb] data-[state=active]:shadow-none data-[state=inactive]:bg-white data-[state=inactive]:text-[#374151] data-[state=inactive]:border-white";

const TAB_FONT_STYLE = { fontFamily: "'Open Sans', sans-serif" };

export function WorkflowJarvisPanel({
	onLoadTemplate,
	onRenameTab: _onRenameTab,
	hasWorkflow: _hasWorkflow = false,
}: WorkflowJarvisPanelProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [panelWidth, setPanelWidth] = useState(297);
	const isResizing = useRef(false);

	const handleResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			isResizing.current = true;
			const startX = e.clientX;
			const startWidth = panelWidth;

			const onMouseMove = (ev: MouseEvent) => {
				if (!isResizing.current) return;
				const newWidth = Math.min(
					Math.max(startWidth + (ev.clientX - startX), 220),
					500,
				);
				setPanelWidth(newWidth);
			};

			const onMouseUp = () => {
				isResizing.current = false;
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		},
		[panelWidth],
	);

	const handleDragStart = (
		e: React.DragEvent,
		item: (typeof TOOLBOX_ITEMS)[0],
	) => {
		e.dataTransfer.setData("application/workflow-activity", item.type);
		e.dataTransfer.setData("application/workflow-label", item.label);
		e.dataTransfer.setData("application/workflow-subtitle", item.subtitle);
		e.dataTransfer.effectAllowed = "move";
	};

	if (collapsed) {
		return (
			<div className="w-8 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center pt-2 shadow-sm">
				<button
					onClick={() => setCollapsed(false)}
					className="p-1 hover:bg-slate-100 rounded transition-colors"
					aria-label="Expand panel"
				>
					<ChevronsRight className="w-4 h-4 text-slate-400" />
				</button>
			</div>
		);
	}

	return (
		<div
			className="shrink-0 bg-white border-r border-[#d1d5db] flex flex-col min-h-0 overflow-hidden relative"
			style={{ width: panelWidth }}
		>
			<Tabs defaultValue="toolbox" className="flex-1 flex flex-col min-h-0">
				<div className="flex items-center px-[9px] py-[8px]">
					<TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
						<TabsTrigger
							value="toolbox"
							className={TAB_TRIGGER_CLASS}
							style={TAB_FONT_STYLE}
						>
							Toolbox
						</TabsTrigger>
						<TabsTrigger
							value="templates"
							className={TAB_TRIGGER_CLASS}
							style={TAB_FONT_STYLE}
						>
							Templates
						</TabsTrigger>
						<TabsTrigger
							value="variables"
							className={TAB_TRIGGER_CLASS}
							style={TAB_FONT_STYLE}
						>
							Variables
						</TabsTrigger>
					</TabsList>
					<div className="flex-1 flex items-center justify-end">
						<button
							onClick={() => setCollapsed(true)}
							className="p-1 hover:bg-slate-100 rounded transition-colors"
							aria-label="Collapse panel"
						>
							<ChevronsLeft className="w-4 h-4 text-slate-400" />
						</button>
					</div>
				</div>

				{/* Toolbox Tab */}
				<TabsContent
					value="toolbox"
					className="flex-1 flex flex-col mt-0 p-0 min-h-0 overflow-hidden"
				>
					<ScrollArea className="flex-1 min-h-0 p-3">
						<div className="space-y-4">
							{["Data", "Integrations", "Logic"].map((category) => {
								const items = TOOLBOX_ITEMS.filter(
									(i) => i.category === category,
								);
								if (items.length === 0) return null;
								return (
									<div key={category}>
										<div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
											{category}
										</div>
										<ul className="space-y-1">
											{items.map((item) => {
												const Icon = ACTIVITY_ICON_MAP[item.type];
												return (
													<li
														key={item.type}
														draggable
														onDragStart={(e) => handleDragStart(e, item)}
														className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-colors group list-none"
													>
														<GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />
														<div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center text-white">
															<Icon className="w-3.5 h-3.5" />
														</div>
														<div className="flex-1 min-w-0">
															<div className="text-sm font-medium text-slate-700 truncate">
																{item.label}
															</div>
															<div className="text-xs text-slate-400 truncate">
																{item.subtitle}
															</div>
														</div>
													</li>
												);
											})}
										</ul>
									</div>
								);
							})}
						</div>
					</ScrollArea>
				</TabsContent>

				{/* Templates Tab */}
				<TabsContent
					value="templates"
					className="flex-1 flex flex-col mt-0 p-0 min-h-0 overflow-hidden"
				>
					<ScrollArea className="flex-1 min-h-0 p-3">
						<div className="space-y-2">
							{WORKFLOW_TEMPLATES.map((template) => (
								<button
									key={template.id}
									onClick={() => onLoadTemplate(template.id)}
									className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
								>
									<div className="flex items-center gap-2 mb-1">
										<FileText className="w-4 h-4 text-blue-500" />
										<span className="text-sm font-medium text-slate-700">
											{template.name}
										</span>
									</div>
									<p className="text-xs text-slate-500 leading-relaxed">
										{template.description}
									</p>
								</button>
							))}
						</div>
					</ScrollArea>
				</TabsContent>

				{/* Variables Tab */}
				<TabsContent
					value="variables"
					className="flex-1 flex flex-col mt-0 p-0 min-h-0 overflow-hidden"
				>
					<WorkflowVariablesPanel />
				</TabsContent>
			</Tabs>
			{/* Resize handle */}
			<div
				aria-hidden="true"
				onMouseDown={handleResizeStart}
				className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400/40 active:bg-blue-500/50 transition-colors z-10"
			/>
		</div>
	);
}
