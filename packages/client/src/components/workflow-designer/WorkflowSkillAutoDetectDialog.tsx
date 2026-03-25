import type { Node } from "@xyflow/react";
import { Play, Plus, Shield, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import {
	MOCK_WORKFLOW_VARIABLES,
	type WorkflowVariable,
} from "./workflowDesignerData";

/** Variables always populated from webhooks -- auto-excluded from required inputs */
const PROTECTED_VARIABLES = ["raw_data", "webhook_payload", "trigger_context"];

/** Simulated webhook/trigger variables that exist in every workflow */
const WEBHOOK_VARIABLES: WorkflowVariable[] = [
	{
		name: "raw_data",
		activityId: "start",
		activityLabel: "Webhook",
		type: "object",
	},
	{
		name: "webhook_payload",
		activityId: "start",
		activityLabel: "Webhook",
		type: "object",
	},
	{
		name: "trigger_context",
		activityId: "start",
		activityLabel: "Webhook",
		type: "string",
	},
];

interface DetectedVariable {
	variable: WorkflowVariable;
	description: string;
	selected: boolean;
	isProtected: boolean;
	isCustom: boolean;
}

interface WorkflowSkillAutoDetectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRun: (variableNames: string[]) => void;
	nodes: Node[];
}

export function WorkflowSkillAutoDetectDialog({
	open,
	onOpenChange,
	onRun,
	nodes: _nodes,
}: WorkflowSkillAutoDetectDialogProps) {
	const [inputVars, setInputVars] = useState<DetectedVariable[]>([]);
	const [addingCustomInput, setAddingCustomInput] = useState(false);
	const [customInputName, setCustomInputName] = useState("");
	const [customInputType, setCustomInputType] =
		useState<WorkflowVariable["type"]>("string");

	const allVariables = useMemo(
		() => [...WEBHOOK_VARIABLES, ...MOCK_WORKFLOW_VARIABLES],
		[],
	);

	useEffect(() => {
		if (open) {
			setAddingCustomInput(false);
			setCustomInputName("");
			setCustomInputType("string");

			setInputVars(
				allVariables.map((v) => ({
					variable: v,
					description: "",
					selected: !PROTECTED_VARIABLES.includes(v.name),
					isProtected: PROTECTED_VARIABLES.includes(v.name),
					isCustom: false,
				})),
			);
		}
	}, [open, allVariables]);

	const protectedVars = inputVars.filter((v) => v.isProtected);
	const selectedVars = inputVars.filter((v) => v.selected && !v.isProtected);
	const totalCount = protectedVars.length + selectedVars.length;

	const updateInputDescription = (varName: string, desc: string) => {
		setInputVars((prev) =>
			prev.map((v) =>
				v.variable.name === varName ? { ...v, description: desc } : v,
			),
		);
	};

	const removeVar = (varName: string, isCustom: boolean) => {
		if (isCustom) {
			setInputVars((prev) => prev.filter((v) => v.variable.name !== varName));
		} else {
			setInputVars((prev) =>
				prev.map((v) =>
					v.variable.name === varName ? { ...v, selected: false } : v,
				),
			);
		}
	};

	const addCustomVariable = () => {
		const trimmed = customInputName.trim();
		if (!trimmed || inputVars.some((v) => v.variable.name === trimmed)) return;
		setInputVars((prev) => [
			...prev,
			{
				variable: {
					name: trimmed,
					activityId: "custom",
					activityLabel: "Custom",
					type: customInputType,
				},
				description: "",
				selected: true,
				isProtected: false,
				isCustom: true,
			},
		]);
		setCustomInputName("");
		setCustomInputType("string");
		setAddingCustomInput(false);
	};

	const handleRun = () => {
		const variableNames = inputVars
			.filter((v) => v.selected && !v.isProtected)
			.map((v) => v.variable.name);
		onRun(variableNames);
		onOpenChange(false);
		toast.success("Workflow started");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Play className="w-4 h-4 text-emerald-600" aria-hidden="true" />
						Set Values &amp; Run
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-3 py-1">
					<p className="text-xs text-slate-500">
						Insert values for desired variables. These values will be used
						during <strong>this</strong> workflow execution.
					</p>

					{/* Detected Inputs */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<Label className="text-xs font-medium text-slate-600">
								Detected Inputs ({totalCount})
							</Label>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2"
								onClick={() => setAddingCustomInput(true)}
								aria-label="Add custom variable"
							>
								<Plus className="w-3 h-3 mr-1" aria-hidden="true" />
								Add
							</Button>
						</div>

						{/* Add custom variable inline */}
						{addingCustomInput && (
							<div className="flex items-center gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50/30 p-2">
								<Input
									value={customInputName}
									onChange={(e) => setCustomInputName(e.target.value)}
									placeholder="Variable name"
									className="text-xs h-7 flex-1 font-mono"
									aria-label="Custom variable name"
									onKeyDown={(e) => {
										if (e.key === "Enter") addCustomVariable();
										if (e.key === "Escape") setAddingCustomInput(false);
									}}
								/>
								<select
									value={customInputType}
									onChange={(e) =>
										setCustomInputType(
											e.target.value as WorkflowVariable["type"],
										)
									}
									className="text-[11px] h-7 rounded border border-slate-200 bg-white text-slate-600 px-1.5"
									aria-label="Custom variable type"
								>
									<option value="string">string</option>
									<option value="number">number</option>
									<option value="boolean">boolean</option>
									<option value="object">object</option>
									<option value="array">array</option>
								</select>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-xs"
									onClick={addCustomVariable}
									disabled={!customInputName.trim()}
								>
									Add
								</Button>
								<button
									type="button"
									onClick={() => setAddingCustomInput(false)}
									className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
									aria-label="Cancel adding custom variable"
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						)}

						{/* Variable list */}
						<div className="max-h-[280px] overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
							{/* Protected vars */}
							{protectedVars.map((v) => (
								<div
									key={v.variable.name}
									className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50/80 text-slate-400"
								>
									<Shield
										className="w-3.5 h-3.5 shrink-0"
										aria-label="Protected"
									/>
									<span className="text-xs font-mono truncate min-w-[110px]">
										{v.variable.name}
									</span>
									<span className="text-[10px] min-w-[40px]">
										{v.variable.type}
									</span>
									<span className="text-[10px] flex-1 truncate">
										{v.variable.activityLabel}
									</span>
								</div>
							))}

							{/* Separator between protected and editable */}
							{protectedVars.length > 0 && selectedVars.length > 0 && (
								<div className="border-t border-slate-200" />
							)}

							{/* Editable vars */}
							{selectedVars.length === 0 && (
								<div className="px-3 py-3 text-xs text-slate-400 text-center">
									No detected inputs. Add a custom variable above.
								</div>
							)}
							{selectedVars.map((v) => (
								<div
									key={v.variable.name}
									className="flex items-center gap-2 px-2.5 py-1.5"
								>
									<span className="text-xs font-mono text-slate-700 truncate min-w-[110px]">
										{v.variable.name}
									</span>
									<span className="text-[10px] text-slate-400 min-w-[40px]">
										{v.variable.type}
									</span>
									<span className="text-[10px] text-slate-400 truncate max-w-[80px]">
										{v.variable.activityLabel}
									</span>
									<Input
										value={v.description}
										onChange={(e) =>
											updateInputDescription(v.variable.name, e.target.value)
										}
										placeholder="value"
										className="text-[11px] h-6 flex-1 min-w-[80px]"
										aria-label={`Value for ${v.variable.name}`}
									/>
									<button
										type="button"
										onClick={() => removeVar(v.variable.name, v.isCustom)}
										className="p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors shrink-0"
										aria-label={`Remove ${v.variable.name}`}
									>
										<X className="w-3 h-3" />
									</button>
								</div>
							))}
						</div>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						className="bg-emerald-600 hover:bg-emerald-700 text-white"
						onClick={handleRun}
					>
						Run
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
