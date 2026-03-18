import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Play } from "lucide-react";
import type { TriggerType } from "./workflowDesignerTypes";
import { TRIGGER_TYPE_OPTIONS } from "./workflowDesignerTypes";

function getTriggerSubtitle(config: Record<string, unknown>): string | null {
	const triggerType = config?.triggerType as TriggerType | undefined;
	if (!triggerType || triggerType === "manual") return null;

	const option = TRIGGER_TYPE_OPTIONS.find((o) => o.value === triggerType);
	if (!option) return null;

	if (triggerType === "schedule" && config.interval) {
		const intervalLabels: Record<string, string> = {
			"5m": "Every 5 min",
			"15m": "Every 15 min",
			"1h": "Every hour",
			"6h": "Every 6 hours",
			"1d": "Daily",
			custom: "Custom cron",
		};
		return intervalLabels[config.interval as string] ?? option.label;
	}

	return option.label;
}

export function WorkflowStartNode({ selected, data }: NodeProps) {
	const config = (data?.config ?? {}) as Record<string, unknown>;
	const triggerType = (config?.triggerType as TriggerType) ?? "manual";
	const subtitle = getTriggerSubtitle(config);
	const triggerOption = TRIGGER_TYPE_OPTIONS.find(
		(o) => o.value === triggerType,
	);
	const TriggerIcon = triggerOption?.icon;

	return (
		<div
			className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 bg-white shadow-sm transition-all cursor-pointer hover:shadow-md ${
				selected
					? "border-emerald-500 ring-2 ring-emerald-500/20"
					: "border-slate-200 hover:border-emerald-300"
			}`}
		>
			<div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
				<Play className="w-3 h-3" />
			</div>
			<div className="flex items-center gap-1.5">
				<span className="text-sm font-semibold text-slate-700">START</span>
				{subtitle && TriggerIcon && (
					<>
						<span className="text-slate-300">|</span>
						<TriggerIcon className="w-3 h-3 text-emerald-500" />
						<span className="text-xs text-slate-500">{subtitle}</span>
					</>
				)}
			</div>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
			/>
		</div>
	);
}
