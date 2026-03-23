import confetti from "canvas-confetti";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
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

/** Typeahead combobox for picking workflow variables */
function VariableTypeahead({
	label,
	selected,
	onSelect,
	onRemove,
	onUpdateDescription,
	ariaLabel,
}: {
	label: string;
	selected: SelectedVariable[];
	onSelect: (v: WorkflowVariable) => void;
	onRemove: (varName: string) => void;
	onUpdateDescription: (varName: string, desc: string) => void;
	ariaLabel: string;
}) {
	const [query, setQuery] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const blurTimeout = useRef<ReturnType<typeof setTimeout>>();
	const descRef = useRef<HTMLInputElement>(null);
	const [focusNext, setFocusNext] = useState(false);

	const selectedNames = useMemo(
		() => new Set(selected.map((s) => s.variable.name)),
		[selected],
	);

	const filtered = useMemo(
		() =>
			query.trim() === ""
				? []
				: MOCK_WORKFLOW_VARIABLES.filter(
						(v) =>
							!selectedNames.has(v.name) &&
							(v.name.toLowerCase().includes(query.toLowerCase()) ||
								v.activityLabel.toLowerCase().includes(query.toLowerCase())),
					),
		[query, selectedNames],
	);

	useEffect(() => {
		if (focusNext && descRef.current) {
			descRef.current.focus();
			setFocusNext(false);
		}
	}, [focusNext, selected.length]);

	const handleSelect = useCallback(
		(v: WorkflowVariable) => {
			onSelect(v);
			setQuery("");
			setDropdownOpen(false);
			setFocusNext(true);
		},
		[onSelect],
	);

	const handleBlur = useCallback(() => {
		blurTimeout.current = setTimeout(() => setDropdownOpen(false), 150);
	}, []);

	const handleFocus = useCallback(() => {
		if (blurTimeout.current) clearTimeout(blurTimeout.current);
		if (query.trim()) setDropdownOpen(true);
	}, [query]);

	return (
		<div className="space-y-2">
			<Label className="text-xs font-medium text-slate-600">
				{label}
				{selected.length > 0 && (
					<span className="ml-1.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
						{selected.length}
					</span>
				)}
			</Label>

			{/* Search input */}
			<div className="relative">
				<Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
				<Input
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setDropdownOpen(e.target.value.trim() !== "");
					}}
					onFocus={handleFocus}
					onBlur={handleBlur}
					placeholder="Search variables..."
					className="text-xs h-8 pl-8"
					aria-label={ariaLabel}
					role="combobox"
					aria-expanded={dropdownOpen && filtered.length > 0}
					aria-autocomplete="list"
				/>

				{/* Dropdown */}
				{dropdownOpen && filtered.length > 0 && (
					<div
						className="absolute left-0 right-0 top-full mt-1 max-h-[200px] overflow-y-auto border border-slate-200 shadow-md bg-white rounded-md z-10"
						role="listbox"
						aria-label={`${label} suggestions`}
					>
						{filtered.map((v) => (
							<button
								key={v.name}
								type="button"
								role="option"
								aria-selected={false}
								className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-50 transition-colors"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => handleSelect(v)}
								aria-label={`Select ${v.name}`}
							>
								<span className="text-xs font-mono text-slate-700 flex-1 truncate">
									{v.name}
								</span>
								<span className="text-[10px] text-slate-400 shrink-0">
									{v.type}
								</span>
								<span className="text-[10px] text-slate-400 shrink-0 truncate max-w-[100px]">
									{v.activityLabel}
								</span>
							</button>
						))}
					</div>
				)}
				{dropdownOpen && query.trim() !== "" && filtered.length === 0 && (
					<div className="absolute left-0 right-0 top-full mt-1 border border-slate-200 shadow-md bg-white rounded-md z-10 px-3 py-2 text-xs text-slate-400 text-center">
						No variables match
					</div>
				)}
			</div>

			{/* Selected cards */}
			{selected.length > 0 && (
				<ul className="list-none space-y-1.5" aria-label={`Selected ${label.toLowerCase()}`}>
					{selected.map((sel, idx) => (
						<li
							key={sel.variable.name}
							className="rounded-md border border-blue-200 bg-blue-50/50 p-2 space-y-1"
						>
							<div className="flex items-center gap-2">
								<span className="text-xs font-mono font-medium text-blue-700 flex-1 truncate">
									{sel.variable.name}
								</span>
								<span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 shrink-0">
									{sel.variable.type}
								</span>
								<span className="text-[10px] text-slate-400 shrink-0 truncate max-w-[100px]">
									{sel.variable.activityLabel}
								</span>
								<button
									type="button"
									onClick={() => onRemove(sel.variable.name)}
									className="p-0.5 hover:bg-blue-100 rounded text-blue-400 hover:text-blue-600 transition-colors"
									aria-label={`Remove ${sel.variable.name}`}
								>
									<X className="w-3 h-3" />
								</button>
							</div>
							<Input
								ref={idx === selected.length - 1 ? descRef : undefined}
								value={sel.description}
								onChange={(e) =>
									onUpdateDescription(sel.variable.name, e.target.value)
								}
								placeholder="Description"
								className="text-xs h-7"
								aria-label={`${sel.variable.name} description`}
							/>
						</li>
					))}
				</ul>
			)}
		</div>
	);
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
	const [selectedInputs, setSelectedInputs] = useState<SelectedVariable[]>([]);
	const [selectedOutputs, setSelectedOutputs] = useState<SelectedVariable[]>([]);

	useEffect(() => {
		if (open) {
			setName(value.name);
			setDescription(value.description);
			setSelectedInputs(parseSelectedVars(value.inputsJson));
			setSelectedOutputs(parseSelectedVars(value.outputsJson));
		}
	}, [open, value]);

	const canSave = name.trim() !== "";

	const buildMetadata = (): SkillMetadata => ({
		name,
		description,
		toolEid: value.toolEid,
		inputsJson: serializeSelectedVars(selectedInputs),
		outputsJson: serializeSelectedVars(selectedOutputs),
	});

	const handleSave = () => {
		onSave(buildMetadata());
		onOpenChange(false);
	};

	const handlePublish = () => {
		const metadata = buildMetadata();
		onPublish(metadata);
		onOpenChange(false);
		confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
		toast.success("Skill published", {
			description: `${metadata.name} is now available in the Agent Builder.`,
		});
	};

	const addInput = useCallback(
		(v: WorkflowVariable) =>
			setSelectedInputs((prev) => [
				...prev,
				{ variable: v, description: "", defaultValue: "" },
			]),
		[],
	);

	const removeInput = useCallback(
		(varName: string) =>
			setSelectedInputs((prev) =>
				prev.filter((s) => s.variable.name !== varName),
			),
		[],
	);

	const updateInputDesc = useCallback(
		(varName: string, desc: string) =>
			setSelectedInputs((prev) =>
				prev.map((s) =>
					s.variable.name === varName ? { ...s, description: desc } : s,
				),
			),
		[],
	);

	const addOutput = useCallback(
		(v: WorkflowVariable) =>
			setSelectedOutputs((prev) => [
				...prev,
				{ variable: v, description: "", defaultValue: "" },
			]),
		[],
	);

	const removeOutput = useCallback(
		(varName: string) =>
			setSelectedOutputs((prev) =>
				prev.filter((s) => s.variable.name !== varName),
			),
		[],
	);

	const updateOutputDesc = useCallback(
		(varName: string, desc: string) =>
			setSelectedOutputs((prev) =>
				prev.map((s) =>
					s.variable.name === varName ? { ...s, description: desc } : s,
				),
			),
		[],
	);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Configure as Skill</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						{/* Name + Description row */}
						<div className="flex gap-3">
							<div className="flex-1">
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
							<div className="flex-1">
								<Label
									htmlFor="sv-desc"
									className="text-xs font-medium text-slate-600 mb-1.5 block"
								>
									Description
								</Label>
								<Input
									id="sv-desc"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="What does this skill do?"
									className="text-sm h-9"
								/>
							</div>
						</div>

						{/* Inputs typeahead */}
						<VariableTypeahead
							label="Inputs"
							selected={selectedInputs}
							onSelect={addInput}
							onRemove={removeInput}
							onUpdateDescription={updateInputDesc}
							ariaLabel="Search input variables"
						/>

						{/* Outputs typeahead */}
						<VariableTypeahead
							label="Outputs"
							selected={selectedOutputs}
							onSelect={addOutput}
							onRemove={removeOutput}
							onUpdateDescription={updateOutputDesc}
							ariaLabel="Search output variables"
						/>
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
							onClick={handlePublish}
							disabled={!canSave}
						>
							Publish
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
