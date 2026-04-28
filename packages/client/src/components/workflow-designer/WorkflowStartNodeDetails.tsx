import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "./RichTextEditor";

interface SkillParameter {
	id: string;
	name: string;
	type: string;
	description: string;
}

export interface StartNodeDetailsState {
	description: string;
	information: string;
	tags: string[];
	notesExpanded: boolean;
	skillEnabled: boolean;
	skillName: string;
	skillDescription: string;
	parameters: SkillParameter[];
}

interface WorkflowStartNodeDetailsProps {
	workflowName: string;
	state: StartNodeDetailsState;
	onChange: (state: StartNodeDetailsState) => void;
	onPublish: () => void;
}

const DEFAULT_STATE: StartNodeDetailsState = {
	description: "",
	information: "",
	tags: [],
	notesExpanded: false,
	skillEnabled: false,
	skillName: "",
	skillDescription: "",
	parameters: [],
};

export function createDefaultStartNodeState(
	workflowName?: string,
): StartNodeDetailsState {
	return {
		...DEFAULT_STATE,
		skillName: workflowName ?? "",
	};
}

export function WorkflowStartNodeDetails({
	workflowName,
	state,
	onChange,
	onPublish,
}: WorkflowStartNodeDetailsProps) {
	const [tagInput, setTagInput] = useState("");

	const update = useCallback(
		(partial: Partial<StartNodeDetailsState>) => {
			onChange({ ...state, ...partial });
		},
		[state, onChange],
	);

	const addTag = useCallback(
		(raw: string) => {
			const tag = raw.trim();
			if (tag && !state.tags.includes(tag)) {
				update({ tags: [...state.tags, tag] });
			}
			setTagInput("");
		},
		[state.tags, update],
	);

	const removeTag = useCallback(
		(tag: string) => {
			update({ tags: state.tags.filter((t) => t !== tag) });
		},
		[state.tags, update],
	);

	const handleTagKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" || e.key === ",") {
				e.preventDefault();
				addTag(tagInput);
			}
		},
		[tagInput, addTag],
	);

	const addParameter = useCallback(() => {
		const param: SkillParameter = {
			id: crypto.randomUUID(),
			name: "",
			type: "string",
			description: "",
		};
		update({ parameters: [...state.parameters, param] });
	}, [state.parameters, update]);

	const removeParameter = useCallback(
		(id: string) => {
			update({ parameters: state.parameters.filter((p) => p.id !== id) });
		},
		[state.parameters, update],
	);

	const updateParameter = useCallback(
		(id: string, field: keyof SkillParameter, value: string) => {
			update({
				parameters: state.parameters.map((p) =>
					p.id === id ? { ...p, [field]: value } : p,
				),
			});
		},
		[state.parameters, update],
	);

	return (
		<ScrollArea className="flex-1 min-h-0">
			<div className="p-4 space-y-5">
				{/* Section: Description */}
				<div>
					<Label
						htmlFor="start-description"
						className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block"
					>
						Description
					</Label>
					<Textarea
						id="start-description"
						value={state.description}
						onChange={(e) => update({ description: e.target.value })}
						placeholder="Describe what this workflow does..."
						className="text-sm min-h-[60px]"
						aria-label="Workflow description"
					/>
				</div>

				{/* Section: Information */}
				<div>
					<Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">
						Information
					</Label>
					<RichTextEditor
						value={state.information}
						onChange={(html) => update({ information: html })}
						placeholder="Add detailed information about this workflow..."
						ariaLabel="Workflow information"
					/>
				</div>

				{/* Section: Tags */}
				<div>
					<Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">
						Tags
					</Label>
					{state.tags.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mb-2">
							{state.tags.map((tag) => (
								<span
									key={tag}
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
								>
									{tag}
									<button
										type="button"
										onClick={() => removeTag(tag)}
										className="p-0.5 hover:bg-blue-100 rounded-full transition-colors"
										aria-label={`Remove tag ${tag}`}
									>
										<X className="w-3 h-3" />
									</button>
								</span>
							))}
						</div>
					)}
					<div className="flex items-center gap-2">
						<Input
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={handleTagKeyDown}
							placeholder="Add a tag..."
							className="text-sm h-8 flex-1"
							aria-label="Add tag"
						/>
						<Button
							variant="outline"
							size="sm"
							className="h-8 text-xs"
							onClick={() => addTag(tagInput)}
							disabled={!tagInput.trim()}
						>
							<Plus className="w-3 h-3 mr-1" />
							Add
						</Button>
					</div>
				</div>

				{/* Section: Notes (collapsible) */}
				<div className="border-t border-slate-200 pt-3">
					<button
						type="button"
						onClick={() => update({ notesExpanded: !state.notesExpanded })}
						className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-800 transition-colors w-full"
						aria-expanded={state.notesExpanded}
					>
						{state.notesExpanded ? (
							<ChevronDown className="w-3.5 h-3.5" />
						) : (
							<ChevronRight className="w-3.5 h-3.5" />
						)}
						Notes
					</button>
					{state.notesExpanded && (
						<div className="mt-3">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-slate-200">
										<th className="text-left text-xs font-medium text-slate-500 pb-2 pr-2">
											Activity Name
										</th>
										<th className="text-left text-xs font-medium text-slate-500 pb-2">
											Note Details
										</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td
											colSpan={2}
											className="text-center text-xs text-slate-400 italic py-4"
										>
											No notes yet
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* Section: Enable as Skill */}
				<div className="border-t border-slate-200 pt-4">
					<div className="flex items-center justify-between mb-3">
						<Label
							htmlFor="skill-toggle"
							className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
						>
							Enable as Skill
						</Label>
						<Switch
							id="skill-toggle"
							checked={state.skillEnabled}
							onCheckedChange={(checked) => {
								update({
									skillEnabled: checked,
									skillName:
										checked && !state.skillName
											? workflowName
											: state.skillName,
								});
							}}
						/>
					</div>

					{state.skillEnabled && (
						<div className="space-y-4 pl-0.5 border-l-2 border-blue-200 ml-1 p-3 bg-blue-50/30 rounded-r-md">
							<div>
								<Label
									htmlFor="skill-name"
									className="text-xs font-medium text-slate-600 mb-1.5 block"
								>
									Skill Name
								</Label>
								<Input
									id="skill-name"
									value={state.skillName}
									onChange={(e) => update({ skillName: e.target.value })}
									placeholder="Skill name"
									className="text-sm h-8"
									aria-label="Skill name"
								/>
							</div>

							<div>
								<Label
									htmlFor="skill-description"
									className="text-xs font-medium text-slate-600 mb-1.5 block"
								>
									Skill Description
								</Label>
								<Textarea
									id="skill-description"
									value={state.skillDescription}
									onChange={(e) => update({ skillDescription: e.target.value })}
									placeholder="What does this skill do?"
									className="text-sm min-h-[50px]"
									aria-label="Skill description"
								/>
							</div>

							{/* Parameters */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<Label className="text-xs font-medium text-slate-600">
										Parameters
									</Label>
									<Button
										variant="outline"
										size="sm"
										className="h-6 text-xs px-2"
										onClick={addParameter}
									>
										<Plus className="w-3 h-3 mr-1" />
										Add
									</Button>
								</div>

								{state.parameters.length === 0 ? (
									<p className="text-xs text-slate-400 italic py-2">
										No parameters — add one if this skill needs inputs.
									</p>
								) : (
									<div className="space-y-2">
										{state.parameters.map((param) => (
											<div
												key={param.id}
												className="flex items-start gap-1.5 bg-white rounded-md border border-slate-200 p-2"
											>
												<div className="flex-1 space-y-1.5">
													<Input
														value={param.name}
														onChange={(e) =>
															updateParameter(param.id, "name", e.target.value)
														}
														placeholder="Name"
														className="text-xs h-7"
														aria-label="Parameter name"
													/>
													<div className="flex gap-1.5">
														<select
															value={param.type}
															onChange={(e) =>
																updateParameter(
																	param.id,
																	"type",
																	e.target.value,
																)
															}
															className="text-xs h-7 rounded border border-slate-200 bg-white text-slate-600 px-1.5 flex-shrink-0"
															aria-label="Parameter type"
														>
															<option value="string">string</option>
															<option value="number">number</option>
															<option value="boolean">boolean</option>
															<option value="object">object</option>
															<option value="array">array</option>
														</select>
														<Input
															value={param.description}
															onChange={(e) =>
																updateParameter(
																	param.id,
																	"description",
																	e.target.value,
																)
															}
															placeholder="Description"
															className="text-xs h-7 flex-1"
															aria-label="Parameter description"
														/>
													</div>
												</div>
												<button
													type="button"
													onClick={() => removeParameter(param.id)}
													className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
													aria-label={`Remove parameter ${param.name || "unnamed"}`}
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Publish button */}
							<Button
								size="sm"
								className="w-full"
								disabled={!state.skillName.trim()}
								onClick={onPublish}
							>
								Publish Skill
							</Button>
						</div>
					)}
				</div>
			</div>
		</ScrollArea>
	);
}
