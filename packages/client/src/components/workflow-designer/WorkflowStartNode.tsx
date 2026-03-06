import { Handle, Position } from "@xyflow/react";
import { Play } from "lucide-react";

export function WorkflowStartNode({ selected }: { selected?: boolean }) {
	return (
		<div
			className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 bg-white shadow-sm transition-all ${
				selected
					? "border-emerald-500 ring-2 ring-emerald-500/20"
					: "border-slate-200"
			}`}
		>
			<div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
				<Play className="w-3 h-3" />
			</div>
			<span className="text-sm font-semibold text-slate-700">START</span>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
			/>
		</div>
	);
}
