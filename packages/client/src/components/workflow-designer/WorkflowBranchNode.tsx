import { Handle, Position, useReactFlow } from "@xyflow/react";
import { ChevronDown, EllipsisVertical } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkflowToggle } from "./WorkflowToggle";
import type { ActivityNodeData } from "./workflowDesignerTypes";

interface WorkflowBranchNodeProps {
	id: string;
	data: ActivityNodeData;
	selected?: boolean;
}

export function WorkflowBranchNode({
	id,
	data,
	selected,
}: WorkflowBranchNodeProps) {
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
			className={`w-[265px] h-[32px] rounded-[12px] border transition-all ${
				selected
					? "border-[#0050c7] bg-[linear-gradient(90deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.9)_100%),linear-gradient(90deg,#0050c7_0%,#0050c7_100%)]"
					: "border-[#0050c7] bg-[#eff6ff] hover:border-[rgba(0,117,255,0.7)] hover:shadow-[0px_1px_3px_0px_rgba(16,24,40,0.1),0px_1px_2px_0px_rgba(16,24,40,0.1)]"
			}`}
		>
			<Handle
				type="target"
				position={Position.Top}
				className="!w-2.5 !h-2.5 !bg-[#0050c7] !border-2 !border-white"
			/>
			<div
				className={`flex items-center gap-2 px-2 h-full rounded-[12px] border ${
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

				{/* Label */}
				<div className="flex-1 min-w-0">
					<span
						className="text-[12px] leading-[18px] text-[#011331] truncate block"
						style={{
							fontFamily: "'IBM Plex Mono', monospace",
							fontWeight: 500,
						}}
					>
						{data.label}
					</span>
				</div>

				{/* Chevron for expand/collapse */}
				<ChevronDown className="w-[18px] h-[18px] text-[#011331] shrink-0" />

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
				id="true"
				style={{ left: "25%" }}
				className="!w-2.5 !h-2.5 !bg-[#22c55e] !border-2 !border-white"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				id="false"
				style={{ left: "75%" }}
				className="!w-2.5 !h-2.5 !bg-[#ef4444] !border-2 !border-white"
			/>
		</div>
	);
}
