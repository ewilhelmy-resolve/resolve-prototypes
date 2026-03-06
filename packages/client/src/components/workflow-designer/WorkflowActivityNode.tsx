import { Handle, Position, useReactFlow } from "@xyflow/react";
import { EllipsisVertical } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkflowToggle } from "./WorkflowToggle";
import type { ActivityNodeData } from "./workflowDesignerTypes";
import { ACTIVITY_ICON_MAP } from "./workflowDesignerTypes";

interface WorkflowActivityNodeProps {
	id: string;
	data: ActivityNodeData;
	selected?: boolean;
}

export function WorkflowActivityNode({
	id,
	data,
	selected,
}: WorkflowActivityNodeProps) {
	const Icon = ACTIVITY_ICON_MAP[data.activityType];
	const { setNodes } = useReactFlow();

	const handleToggle = (enabled: boolean) => {
		setNodes((nodes) =>
			nodes.map((n) =>
				n.id === id ? { ...n, data: { ...n.data, enabled } } : n,
			),
		);
	};

	return (
		<div
			className={`w-[265px] rounded-[12px] border transition-all ${
				selected
					? "border-[#0075ff] bg-[#f9fafb] shadow-[0px_1px_3px_0px_rgba(16,24,40,0.1),0px_1px_2px_0px_rgba(16,24,40,0.1)]"
					: "border-[#d1d5db] bg-[#f9fafb] hover:border-[rgba(0,117,255,0.7)] hover:shadow-[0px_1px_3px_0px_rgba(16,24,40,0.1),0px_1px_2px_0px_rgba(16,24,40,0.1)]"
			}`}
		>
			<Handle
				type="target"
				position={Position.Top}
				className="!w-2.5 !h-2.5 !bg-[#0075ff] !border-2 !border-white"
			/>
			<div
				className={`flex items-center gap-2 px-2 py-1 rounded-[12px] border ${
					selected ? "border-[#0075ff]" : "border-[rgba(0,117,255,0.1)]"
				}`}
			>
				{/* Kebab menu */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							className="shrink-0 w-4 h-4 flex items-center justify-center hover:bg-black/5 rounded transition-colors"
							aria-label="Activity actions"
						>
							<EllipsisVertical className="w-4 h-4 text-[#6b7280]" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-40">
						<DropdownMenuItem>Copy</DropdownMenuItem>
						<DropdownMenuItem>Cut</DropdownMenuItem>
						<DropdownMenuItem disabled>Paste</DropdownMenuItem>
						<DropdownMenuItem>Select</DropdownMenuItem>
						<DropdownMenuItem disabled>Unselect</DropdownMenuItem>
						<DropdownMenuItem>Settings</DropdownMenuItem>
						<DropdownMenuItem className="text-red-500 focus:text-red-500">
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Icon box */}
				<div className="w-10 h-10 min-w-[40px] rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center shrink-0">
					<Icon className="w-5 h-5 text-[#0050c7]" />
				</div>

				{/* Label + subtitle */}
				<div className="flex-1 min-w-0 flex flex-col">
					<span
						className="text-[12px] leading-[18px] text-[#011331] truncate"
						style={{
							fontFamily: "'IBM Plex Mono', monospace",
							fontWeight: 500,
						}}
					>
						{data.label}
					</span>
					<span
						className="text-[11px] leading-[16px] text-[#6b7280] truncate"
						style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600 }}
					>
						{data.subtitle}
					</span>
				</div>

				{/* Toggle */}
				<WorkflowToggle
					checked={data.enabled}
					onChange={handleToggle}
					aria-label={`Toggle ${data.label}`}
				/>
			</div>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!w-2.5 !h-2.5 !bg-[#0075ff] !border-2 !border-white"
			/>
		</div>
	);
}
