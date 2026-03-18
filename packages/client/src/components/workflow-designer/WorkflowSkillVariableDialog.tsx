import { Check, ChevronDown, ChevronRight, Code2, Search, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
	MOCK_WORKFLOW_VARIABLES,
	type WorkflowVariable,
} from "./workflowDesignerData";
import type { SkillMetadata } from "./workflowDesignerTypes";

/** Per-variable metadata the user fills in after selecting */
interface SelectedVariable {
	variable: WorkflowVariable;
	description: string;
	defaultValue: string;
}

interface WorkflowSkillVariableDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	value: SkillMetadata;
	onSave: (metadata: SkillMetadata) => void;
	onPublish: (metadata: SkillMetadata) => void;
}

export function WorkflowSkillVariableDialog({
	open,
	onOpenChange,
	value,
	onSave,
	onPublish,
}: WorkflowSkillVariableDialogProps) {
	const [name, setName] = useState(value.name);
	const [description, setDescription] = useState(value.description);
	const [toolEid, setToolEid] = useState(value.toolEid);
	const [prePython, setPrePython] = useState(value.prePython ?? "");
	const [postPython, setPostPython] = useState(value.postPython ?? "");
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	// Variable picker state
	const [inputSearch, setInputSearch] = useState("");
	const [selectedInputs, setSelectedInputs] = useState<SelectedVariable[]>([]);
	const [outputSearch, setOutputSearch] = useState("");
	const [selectedOutputs, setSelectedOutputs] = useState<SelectedVariable[]>([]);

	useEffect(() => {
		if (open) {
			setName(value.name);
			setDescription(value.description);
			setToolEid(value.toolEid);
			setPrePython(value.prePython ?? "");
			setPostPython(value.postPython ?? "");
			setInputSearch("");
			setOutputSearch("");
			setSelectedInputs(parseSelectedVars(value.inputsJson));
			setSelectedOutputs(parseSelectedVars(value.outputsJson));
			setShowConfirm(false);
		}
	}, [open, value]);

	const canSave = name.trim() !== "";

	const buildMetadata = (): SkillMetadata => ({
		name,
		description,
		toolEid,
		inputsJson: serializeSelectedVars(selectedInputs),
		outputsJson: serializeSelectedVars(selectedOutputs),
		prePython: prePython.trim() || undefined,
		postPython: postPython.trim() || undefined,
	});

	const handleSave = () => {
		onSave(buildMetadata());
		onOpenChange(false);
	};

	const handlePublish = () => {
		onPublish(buildMetadata());
		setShowConfirm(false);
		onOpenChange(false);
	};

	const inputFilteredVars = useMemo(
		() =>
			MOCK_WORKFLOW_VARIABLES.filter(
				(v) =>
					v.name.toLowerCase().includes(inputSearch.toLowerCase()) ||
					v.activityLabel.toLowerCase().includes(inputSearch.toLowerCase()),
			),
		[inputSearch],
	);

	const inputGrouped = useMemo(() => {
		const map = new Map<string, WorkflowVariable[]>();
		for (const v of inputFilteredVars) {
			const group = map.get(v.activityLabel) ?? [];
			group.push(v);
			map.set(v.activityLabel, group);
		}
		return map;
	}, [inputFilteredVars]);

	const outputFilteredVars = useMemo(
		() =>
			MOCK_WORKFLOW_VARIABLES.filter(
				(v) =>
					v.name.toLowerCase().includes(outputSearch.toLowerCase()) ||
					v.activityLabel.toLowerCase().includes(outputSearch.toLowerCase()),
			),
		[outputSearch],
	);

	const outputGrouped = useMemo(() => {
		const map = new Map<string, WorkflowVariable[]>();
		for (const v of outputFilteredVars) {
			const group = map.get(v.activityLabel) ?? [];
			group.push(v);
			map.set(v.activityLabel, group);
		}
		return map;
	}, [outputFilteredVars]);

	const toggleInput = (variable: WorkflowVariable) => {
		const exists = selectedInputs.find(
			(s) => s.variable.name === variable.name,
		);
		if (exists) {
			setSelectedInputs(
				selectedInputs.filter((s) => s.variable.name !== variable.name),
			);
		} else {
			setSelectedInputs([
				...selectedInputs,
				{ variable, description: "", defaultValue: "" },
			]);
		}
	};

	const toggleOutput = (variable: WorkflowVariable) => {
		const exists = selectedOutputs.find(
			(s) => s.variable.name === variable.name,
		);
		if (exists) {
			setSelectedOutputs(
				selectedOutputs.filter((s) => s.variable.name !== variable.name),
			);
		} else {
			setSelectedOutputs([
				...selectedOutputs,
				{ variable, description: "", defaultValue: "" },
			]);
		}
	};

	const updateInputVar = (
		varName: string,
		field: "description" | "defaultValue",
		val: string,
	) => {
		setSelectedInputs(
			selectedInputs.map((s) =>
				s.variable.name === varName ? { ...s, [field]: val } : s,
			),
		);
	};

	const updateOutputVar = (
		varName: string,
		field: "description" | "defaultValue",
		val: string,
	) => {
		setSelectedOutputs(
			selectedOutputs.map((s) =>
				s.variable.name === varName ? { ...s, [field]: val } : s,
			),
		);
	};

	return (
		<>
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Configure as Skill</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div>
						<Label
							htmlFor="sv-name"
							className="text-xs font-medium text-slate-600 mb-1.5 block"
						>
							Name <span aria-hidden="true">*</span>
						</Label>
						<Input
							id="sv-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Password Reset"
							className="text-sm h-9"
							required
							aria-required="true"
						/>
					</div>
					<div>
						<Label
							htmlFor="sv-desc"
							className="text-xs font-medium text-slate-600 mb-1.5 block"
						>
							Description
						</Label>
						<Textarea
							id="sv-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What does this workflow do when used as a skill?"
							className="text-sm min-h-[60px]"
						/>
					</div>
					<div>
						<Label
							htmlFor="sv-eid"
							className="text-xs font-medium text-slate-600 mb-1.5 block"
						>
							Tool EID
						</Label>
						<Input
							id="sv-eid"
							value={toolEid}
							onChange={(e) => setToolEid(e.target.value)}
							placeholder="auto-generated"
							className="text-sm h-9 font-mono"
						/>
					</div>

					{/* Inputs — variable picker */}
					<div className="space-y-2">
						<Label className="text-xs font-medium text-slate-600">
							Inputs
							{selectedInputs.length > 0 && (
								<span className="ml-1.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
									{selectedInputs.length}
								</span>
							)}
						</Label>

						{selectedInputs.length > 0 && (
							<ul
								className="list-none space-y-1.5"
								aria-label="Selected input variables"
							>
								{selectedInputs.map((sel) => (
									<li
										key={sel.variable.name}
										className="rounded-md border border-blue-200 bg-blue-50/50 p-2 space-y-1.5"
									>
										<div className="flex items-center gap-2">
											<span className="text-xs font-mono font-medium text-blue-700 flex-1">
												{sel.variable.name}
											</span>
											<span className="text-[10px] text-slate-400">
												{sel.variable.type}
											</span>
											<span className="text-[10px] text-slate-400">
												{sel.variable.activityLabel}
											</span>
											<button
												type="button"
												onClick={() => toggleInput(sel.variable)}
												className="p-0.5 hover:bg-blue-100 rounded text-blue-400 hover:text-blue-600 transition-colors"
												aria-label={`Remove ${sel.variable.name}`}
											>
												<X className="w-3 h-3" />
											</button>
										</div>
										<Input
											value={sel.description}
											onChange={(e) =>
												updateInputVar(
													sel.variable.name,
													"description",
													e.target.value,
												)
											}
											placeholder="Description"
											className="text-xs h-7"
											aria-label={`${sel.variable.name} description`}
										/>
										<Input
											value={sel.defaultValue}
											onChange={(e) =>
												updateInputVar(
													sel.variable.name,
													"defaultValue",
													e.target.value,
												)
											}
											placeholder="Default value (optional)"
											className="text-xs h-7"
											aria-label={`${sel.variable.name} default value`}
										/>
									</li>
								))}
							</ul>
						)}

						<div className="relative">
							<Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
							<Input
								value={inputSearch}
								onChange={(e) => setInputSearch(e.target.value)}
								placeholder="Search variables..."
								className="text-xs h-8 pl-8"
								aria-label="Search input variables"
							/>
						</div>

						<div className="max-h-[200px] overflow-y-auto rounded-md border border-slate-200">
							{Array.from(inputGrouped.entries()).map(
								([activityLabel, vars]) => (
									<div key={activityLabel}>
										<div className="px-2.5 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
											{activityLabel}
										</div>
										{vars.map((v) => {
											const isSelected = selectedInputs.some(
												(s) => s.variable.name === v.name,
											);
											return (
												<button
													key={v.name}
													type="button"
													className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-50 transition-colors ${
														isSelected ? "bg-blue-50" : ""
													}`}
													onClick={() => toggleInput(v)}
													aria-label={`${isSelected ? "Deselect" : "Select"} ${v.name}`}
												>
													<div
														className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
															isSelected
																? "bg-blue-600 border-blue-600"
																: "border-slate-300"
														}`}
													>
														{isSelected && (
															<Check className="w-3 h-3 text-white" />
														)}
													</div>
													<span className="text-xs font-mono text-slate-700 flex-1 truncate">
														{v.name}
													</span>
													<span className="text-[10px] text-slate-400">
														{v.type}
													</span>
												</button>
											);
										})}
									</div>
								),
							)}
							{inputGrouped.size === 0 && (
								<div className="px-3 py-4 text-xs text-slate-400 text-center">
									No variables match
								</div>
							)}
						</div>
					</div>

					{/* Outputs — variable picker */}
					<div className="space-y-2">
						<Label className="text-xs font-medium text-slate-600">
							Outputs
							{selectedOutputs.length > 0 && (
								<span className="ml-1.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
									{selectedOutputs.length}
								</span>
							)}
						</Label>

						{selectedOutputs.length > 0 && (
							<ul
								className="list-none space-y-1.5"
								aria-label="Selected output variables"
							>
								{selectedOutputs.map((sel) => (
									<li
										key={sel.variable.name}
										className="rounded-md border border-blue-200 bg-blue-50/50 p-2 space-y-1.5"
									>
										<div className="flex items-center gap-2">
											<span className="text-xs font-mono font-medium text-blue-700 flex-1">
												{sel.variable.name}
											</span>
											<span className="text-[10px] text-slate-400">
												{sel.variable.type}
											</span>
											<span className="text-[10px] text-slate-400">
												{sel.variable.activityLabel}
											</span>
											<button
												type="button"
												onClick={() => toggleOutput(sel.variable)}
												className="p-0.5 hover:bg-blue-100 rounded text-blue-400 hover:text-blue-600 transition-colors"
												aria-label={`Remove ${sel.variable.name}`}
											>
												<X className="w-3 h-3" />
											</button>
										</div>
										<Input
											value={sel.description}
											onChange={(e) =>
												updateOutputVar(
													sel.variable.name,
													"description",
													e.target.value,
												)
											}
											placeholder="Description"
											className="text-xs h-7"
											aria-label={`${sel.variable.name} description`}
										/>
										<Input
											value={sel.defaultValue}
											onChange={(e) =>
												updateOutputVar(
													sel.variable.name,
													"defaultValue",
													e.target.value,
												)
											}
											placeholder="Default value (optional)"
											className="text-xs h-7"
											aria-label={`${sel.variable.name} default value`}
										/>
									</li>
								))}
							</ul>
						)}

						<div className="relative">
							<Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
							<Input
								value={outputSearch}
								onChange={(e) => setOutputSearch(e.target.value)}
								placeholder="Search variables..."
								className="text-xs h-8 pl-8"
								aria-label="Search output variables"
							/>
						</div>

						<div className="max-h-[200px] overflow-y-auto rounded-md border border-slate-200">
							{Array.from(outputGrouped.entries()).map(
								([activityLabel, vars]) => (
									<div key={activityLabel}>
										<div className="px-2.5 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
											{activityLabel}
										</div>
										{vars.map((v) => {
											const isSelected = selectedOutputs.some(
												(s) => s.variable.name === v.name,
											);
											return (
												<button
													key={v.name}
													type="button"
													className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-50 transition-colors ${
														isSelected ? "bg-blue-50" : ""
													}`}
													onClick={() => toggleOutput(v)}
													aria-label={`${isSelected ? "Deselect" : "Select"} ${v.name}`}
												>
													<div
														className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
															isSelected
																? "bg-blue-600 border-blue-600"
																: "border-slate-300"
														}`}
													>
														{isSelected && (
															<Check className="w-3 h-3 text-white" />
														)}
													</div>
													<span className="text-xs font-mono text-slate-700 flex-1 truncate">
														{v.name}
													</span>
													<span className="text-[10px] text-slate-400">
														{v.type}
													</span>
												</button>
											);
										})}
									</div>
								),
							)}
							{outputGrouped.size === 0 && (
								<div className="px-3 py-4 text-xs text-slate-400 text-center">
									No variables match
								</div>
							)}
						</div>
					</div>

					{/* Advanced: pre/post python scripts */}
					<div className="border-t border-slate-200 pt-3">
						<button
							type="button"
							className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
							onClick={() => setAdvancedOpen(!advancedOpen)}
							aria-expanded={advancedOpen}
						>
							{advancedOpen ? (
								<ChevronDown className="w-3.5 h-3.5" />
							) : (
								<ChevronRight className="w-3.5 h-3.5" />
							)}
							<Code2 className="w-3.5 h-3.5" />
							Advanced Scripts
						</button>

						{advancedOpen && (
							<div className="mt-3 space-y-3">
								<div>
									<Label
										htmlFor="sv-pre-python"
										className="text-xs text-slate-500 mb-1.5 block"
									>
										Pre-script (runs before tool)
									</Label>
									<Textarea
										id="sv-pre-python"
										value={prePython}
										onChange={(e) => setPrePython(e.target.value)}
										placeholder="# Python script to clean up inputs..."
										className="text-xs font-mono min-h-[100px] resize-y"
									/>
								</div>
								<div>
									<Label
										htmlFor="sv-post-python"
										className="text-xs text-slate-500 mb-1.5 block"
									>
										Post-script (runs after tool)
									</Label>
									<Textarea
										id="sv-post-python"
										value={postPython}
										onChange={(e) => setPostPython(e.target.value)}
										placeholder="# Python script to clean up outputs..."
										className="text-xs font-mono min-h-[100px] resize-y"
									/>
								</div>
							</div>
						)}
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
						variant="secondary"
						size="sm"
						onClick={handleSave}
						disabled={!canSave}
					>
						Save for Later
					</Button>
					<Button
						size="sm"
						onClick={() => setShowConfirm(true)}
						disabled={!canSave}
					>
						Publish
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		{/* Publish confirmation */}
		<Dialog open={showConfirm} onOpenChange={setShowConfirm}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Publish Skill</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-slate-600 leading-relaxed">
					This will make <span className="font-semibold">{name}</span> available
					as a skill in the Agent Builder. Agents will be able to use this
					workflow as a tool.
				</p>
				<DialogFooter>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowConfirm(false)}
					>
						Cancel
					</Button>
					<Button size="sm" onClick={handlePublish}>
						Confirm &amp; Publish
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
}

/** Serialize selected variables to JSON string for storage */
function serializeSelectedVars(selected: SelectedVariable[]): string {
	if (selected.length === 0) return "";
	const obj: Record<
		string,
		{ type: string; description: string; default?: string; activity: string }
	> = {};
	for (const s of selected) {
		obj[s.variable.name] = {
			type: s.variable.type,
			description: s.description,
			...(s.defaultValue ? { default: s.defaultValue } : {}),
			activity: s.variable.activityLabel,
		};
	}
	return JSON.stringify(obj, null, 2);
}

/** Parse JSON string back to selected variables */
function parseSelectedVars(json: string): SelectedVariable[] {
	if (!json.trim()) return [];
	try {
		const obj = JSON.parse(json) as Record<
			string,
			{
				type?: string;
				description?: string;
				default?: string;
				activity?: string;
			}
		>;
		return Object.entries(obj).map(([varName, meta]) => {
			const found = MOCK_WORKFLOW_VARIABLES.find((v) => v.name === varName);
			return {
				variable: found ?? {
					name: varName,
					activityId: "",
					activityLabel: meta.activity ?? "Unknown",
					type: (meta.type as WorkflowVariable["type"]) ?? "string",
				},
				description: meta.description ?? "",
				defaultValue: meta.default ?? "",
			};
		});
	} catch {
		return [];
	}
}
