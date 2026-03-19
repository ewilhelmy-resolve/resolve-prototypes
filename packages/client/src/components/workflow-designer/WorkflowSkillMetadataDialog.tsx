import confetti from "canvas-confetti";
import { ChevronDown, ChevronRight, Code2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import type { SkillMetadata } from "./workflowDesignerTypes";

interface WorkflowSkillMetadataDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	value: SkillMetadata;
	onSave: (metadata: SkillMetadata) => void;
	onPublish: (metadata: SkillMetadata) => void;
}

export function WorkflowSkillMetadataDialog({
	open,
	onOpenChange,
	value,
	onSave,
	onPublish,
}: WorkflowSkillMetadataDialogProps) {
	const [name, setName] = useState(value.name);
	const [description, setDescription] = useState(value.description);
	const [toolEid, setToolEid] = useState(value.toolEid);
	const [inputsJson, setInputsJson] = useState(value.inputsJson);
	const [outputsJson, setOutputsJson] = useState(value.outputsJson);
	const [prePython, setPrePython] = useState(value.prePython ?? "");
	const [postPython, setPostPython] = useState(value.postPython ?? "");
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	useEffect(() => {
		if (open) {
			setName(value.name);
			setDescription(value.description);
			setToolEid(value.toolEid);
			setInputsJson(value.inputsJson);
			setOutputsJson(value.outputsJson);
			setPrePython(value.prePython ?? "");
			setPostPython(value.postPython ?? "");
			setShowConfirm(false);
		}
	}, [open, value]);

	const canSave = name.trim() !== "";

	const buildMetadata = (): SkillMetadata => ({
		name,
		description,
		toolEid,
		inputsJson,
		outputsJson,
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
		confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
	};

	return (
		<>
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Configure as Skill</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div>
						<Label
							htmlFor="skill-name"
							className="text-xs font-medium text-slate-600 mb-1.5 block"
						>
							Name <span aria-hidden="true">*</span>
						</Label>
						<Input
							id="skill-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Password Reset"
							className="text-sm h-9"
							required
							aria-required="true"
							aria-label="Skill name"
						/>
					</div>
					<div>
						<Label
							htmlFor="skill-desc"
							className="text-xs font-medium text-slate-600 mb-1.5 block"
						>
							Description
						</Label>
						<Textarea
							id="skill-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="What does this workflow do when used as a skill?"
							className="text-sm min-h-[60px]"
							aria-label="Skill description"
						/>
					</div>
					<div>
						<Label
							htmlFor="tool-eid"
							className="text-xs font-medium text-slate-600 mb-1.5 block"
						>
							Tool EID
						</Label>
						<Input
							id="tool-eid"
							value={toolEid}
							onChange={(e) => setToolEid(e.target.value)}
							placeholder="auto-generated"
							className="text-sm h-9 font-mono"
							aria-label="Tool EID"
						/>
					</div>
					<div>
						<Label
							htmlFor="skill-inputs"
							className="text-xs font-medium text-slate-600 mb-1.5 block"
						>
							Inputs (JSON)
						</Label>
						<Textarea
							id="skill-inputs"
							value={inputsJson}
							onChange={(e) => setInputsJson(e.target.value)}
							placeholder='{ "ticket_id": "string", "user_email": "string" }'
							className="text-xs font-mono min-h-[80px] resize-y"
							aria-label="Skill inputs JSON"
						/>
					</div>
					<div>
						<Label
							htmlFor="skill-outputs"
							className="text-xs font-medium text-slate-600 mb-1.5 block"
						>
							Outputs (JSON)
						</Label>
						<Textarea
							id="skill-outputs"
							value={outputsJson}
							onChange={(e) => setOutputsJson(e.target.value)}
							placeholder='{ "status": "string", "result": "object" }'
							className="text-xs font-mono min-h-[80px] resize-y"
							aria-label="Skill outputs JSON"
						/>
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
										htmlFor="skill-pre-python"
										className="text-xs text-slate-500 mb-1.5 block"
									>
										Pre-script (runs before tool)
									</Label>
									<Textarea
										id="skill-pre-python"
										value={prePython}
										onChange={(e) => setPrePython(e.target.value)}
										placeholder="# Python script to clean up inputs..."
										className="text-xs font-mono min-h-[100px] resize-y"
										aria-label="Pre-script Python"
									/>
								</div>
								<div>
									<Label
										htmlFor="skill-post-python"
										className="text-xs text-slate-500 mb-1.5 block"
									>
										Post-script (runs after tool)
									</Label>
									<Textarea
										id="skill-post-python"
										value={postPython}
										onChange={(e) => setPostPython(e.target.value)}
										placeholder="# Python script to clean up outputs..."
										className="text-xs font-mono min-h-[100px] resize-y"
										aria-label="Post-script Python"
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
