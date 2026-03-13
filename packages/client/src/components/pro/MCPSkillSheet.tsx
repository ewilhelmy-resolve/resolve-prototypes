import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_PRO_RUNBOOKS } from "@/data/mock-pro";
import type { MCPSkill, MCPVariable } from "@/types/pro";
import { MCPVariableEditor } from "./MCPVariableEditor";

const NONE_WORKFLOW = "__none__";

interface MCPSkillSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	skill?: MCPSkill | null;
	onSave: (skill: Omit<MCPSkill, "id" | "createdAt" | "updatedAt">) => void;
}

function getInitialState(skill?: MCPSkill | null) {
	return {
		workflowId: NONE_WORKFLOW,
		name: skill?.name ?? "",
		description: skill?.description ?? "",
		variables: skill?.variables ?? ([] as MCPVariable[]),
	};
}

export function MCPSkillSheet({
	open,
	onOpenChange,
	skill,
	onSave,
}: MCPSkillSheetProps) {
	const isEdit = !!skill;
	const [form, setForm] = useState(() => getInitialState(skill));

	useEffect(() => {
		if (open) {
			setForm(getInitialState(skill));
		}
	}, [open, skill]);

	const handleClose = () => {
		onOpenChange(false);
	};

	const handleSave = () => {
		onSave({
			name: form.name,
			description: form.description,
			endpoint: form.workflowId === NONE_WORKFLOW ? "" : form.workflowId,
			authType: "none",
			variables: form.variables,
		});
		handleClose();
	};

	const canSave = form.name.trim() !== "";

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						{isEdit ? "Edit MCP Skill" : "Add MCP Skill"}
					</SheetTitle>
					<SheetDescription>
						{isEdit
							? "Update the skill configuration below."
							: "Select a workflow and configure the MCP skill."}
					</SheetDescription>
				</SheetHeader>

				<form
					className="flex flex-col gap-4 px-4"
					onSubmit={(e) => {
						e.preventDefault();
						handleSave();
					}}
					aria-label={isEdit ? "Edit MCP skill" : "Add MCP skill"}
				>
					<div className="space-y-1.5">
						<Label htmlFor="skill-workflow">Select a Workflow</Label>
						<Select
							value={form.workflowId}
							onValueChange={(val) =>
								setForm((f) => ({ ...f, workflowId: val }))
							}
						>
							<SelectTrigger id="skill-workflow">
								<SelectValue placeholder="Select a workflow" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NONE_WORKFLOW}>None</SelectItem>
								{MOCK_PRO_RUNBOOKS.map((rb) => (
									<SelectItem key={rb.id} value={rb.id}>
										{rb.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="skill-name">
							Name <span aria-hidden="true">*</span>
						</Label>
						<Input
							id="skill-name"
							placeholder="e.g. Password Reset Service"
							value={form.name}
							onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							required
							aria-required="true"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="skill-description">Description</Label>
						<Textarea
							id="skill-description"
							placeholder="What does this skill do?"
							value={form.description}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									description: e.target.value,
								}))
							}
							className="min-h-12 resize-none"
						/>
					</div>

					<MCPVariableEditor
						variables={form.variables}
						onChange={(variables) => setForm((f) => ({ ...f, variables }))}
					/>
				</form>

				<SheetFooter>
					<Button type="button" variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button type="button" onClick={handleSave} disabled={!canSave}>
						Save
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
