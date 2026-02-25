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
import type { MCPAuthType, MCPSkill, MCPVariable } from "@/types/pro";
import { MCPVariableEditor } from "./MCPVariableEditor";

const AUTH_TYPE_OPTIONS: { value: MCPAuthType; label: string }[] = [
	{ value: "none", label: "None" },
	{ value: "bearer", label: "Bearer Token" },
	{ value: "api_key", label: "API Key" },
];

interface MCPSkillSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	skill?: MCPSkill | null;
	onSave: (skill: Omit<MCPSkill, "id" | "createdAt" | "updatedAt">) => void;
}

function getInitialState(skill?: MCPSkill | null) {
	return {
		name: skill?.name ?? "",
		description: skill?.description ?? "",
		endpoint: skill?.endpoint ?? "",
		authType: skill?.authType ?? ("none" as MCPAuthType),
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
			endpoint: form.endpoint,
			authType: form.authType,
			variables: form.variables,
		});
		handleClose();
	};

	const canSave = form.name.trim() !== "" && form.endpoint.trim() !== "";

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						{isEdit ? "Edit MCP Skill" : "Create MCP Skill"}
					</SheetTitle>
					<SheetDescription>
						{isEdit
							? "Update the skill configuration below."
							: "Define a new MCP skill with its endpoint and variables."}
					</SheetDescription>
				</SheetHeader>

				<form
					className="flex flex-col gap-4 px-4"
					onSubmit={(e) => {
						e.preventDefault();
						handleSave();
					}}
					aria-label={isEdit ? "Edit MCP skill" : "Create MCP skill"}
				>
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

					<div className="space-y-1.5">
						<Label htmlFor="skill-endpoint">
							Endpoint <span aria-hidden="true">*</span>
						</Label>
						<Input
							id="skill-endpoint"
							type="url"
							placeholder="https://mcp.internal/skills/..."
							value={form.endpoint}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									endpoint: e.target.value,
								}))
							}
							required
							aria-required="true"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="skill-auth-type">Auth Type</Label>
						<Select
							value={form.authType}
							onValueChange={(val) =>
								setForm((f) => ({
									...f,
									authType: val as MCPAuthType,
								}))
							}
						>
							<SelectTrigger id="skill-auth-type">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{AUTH_TYPE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
						{isEdit ? "Save Changes" : "Save Skill"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
