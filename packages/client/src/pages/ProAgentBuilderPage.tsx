import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ProLayout } from "@/components/layouts/ProLayout";
import { EndpointPreview } from "@/components/pro/EndpointPreview";
import { MCPSkillSheet } from "@/components/pro/MCPSkillSheet";
import { ProSubNav } from "@/components/pro/ProSubNav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	MOCK_MCP_SKILLS,
	MOCK_PRO_AGENTS,
	MOCK_PRO_WORKFLOWS,
} from "@/data/mock-pro";
import type { MCPSkill } from "@/types/pro";

const NONE_WORKFLOW = "__none__";

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export default function ProAgentBuilderPage() {
	const { id } = useParams<{ id: string }>();
	const existingAgent = id
		? MOCK_PRO_AGENTS.find((a) => a.id === id)
		: undefined;
	const isEdit = !!existingAgent;

	const [name, setName] = useState(existingAgent?.name ?? "");
	const [description, setDescription] = useState(
		existingAgent?.description ?? "",
	);
	const [endpointSlug, setEndpointSlug] = useState(
		existingAgent?.endpointSlug ?? "",
	);
	const [workflowId, setWorkflowId] = useState(
		existingAgent?.workflowId ?? NONE_WORKFLOW,
	);
	const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
		existingAgent?.skillIds ?? [],
	);
	const [skillSheetOpen, setSkillSheetOpen] = useState(false);
	const [localSkills, setLocalSkills] = useState<MCPSkill[]>([
		...MOCK_MCP_SKILLS,
	]);

	const slugManuallyEdited = useRef(!!existingAgent?.endpointSlug);

	useEffect(() => {
		if (!slugManuallyEdited.current) {
			setEndpointSlug(slugify(name));
		}
	}, [name]);

	const handleSlugChange = (value: string) => {
		slugManuallyEdited.current = value !== "";
		setEndpointSlug(value);
	};

	const handleSkillToggle = (skillId: string, checked: boolean) => {
		setSelectedSkillIds((prev) =>
			checked ? [...prev, skillId] : prev.filter((id) => id !== skillId),
		);
	};

	const handleSkillCreate = useCallback(
		(skillData: Omit<MCPSkill, "id" | "createdAt" | "updatedAt">) => {
			const now = new Date().toISOString();
			const newSkill: MCPSkill = {
				...skillData,
				id: crypto.randomUUID(),
				createdAt: now,
				updatedAt: now,
			};
			setLocalSkills((prev) => [...prev, newSkill]);
			setSelectedSkillIds((prev) => [...prev, newSkill.id]);
		},
		[],
	);

	const assembleAgent = () => ({
		name,
		description,
		endpointSlug,
		workflowId: workflowId === NONE_WORKFLOW ? null : workflowId,
		skillIds: selectedSkillIds,
	});

	const handleSaveDraft = () => {
		console.log("Save draft:", assembleAgent());
	};

	const handlePublish = () => {
		console.log("Publish:", assembleAgent());
	};

	const selectedSkills = localSkills.filter((s) =>
		selectedSkillIds.includes(s.id),
	);

	return (
		<ProLayout>
			<ProSubNav />
			<div className="p-6">
				<h1 className="text-2xl font-bold mb-6">
					{isEdit ? "Edit Agent" : "Create Agent"}
				</h1>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Left: Agent Config */}
					<form
						className="space-y-5"
						onSubmit={(e) => e.preventDefault()}
						aria-label={isEdit ? "Edit agent" : "Create agent"}
					>
						<div className="space-y-1.5">
							<Label htmlFor="agent-name">
								Name <span aria-hidden="true">*</span>
							</Label>
							<Input
								id="agent-name"
								placeholder="e.g. Password Reset"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								aria-required="true"
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="agent-description">Description</Label>
							<Textarea
								id="agent-description"
								placeholder="What does this agent do?"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="min-h-12 resize-none"
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="agent-slug">Endpoint Slug</Label>
							<Input
								id="agent-slug"
								placeholder="auto-generated-from-name"
								value={endpointSlug}
								onChange={(e) => handleSlugChange(e.target.value)}
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="agent-workflow">Workflow</Label>
							<Select value={workflowId} onValueChange={setWorkflowId}>
								<SelectTrigger id="agent-workflow">
									<SelectValue placeholder="Select a workflow" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NONE_WORKFLOW}>None</SelectItem>
									{MOCK_PRO_WORKFLOWS.map((wf) => (
										<SelectItem key={wf.id} value={wf.id}>
											{wf.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-3">
							<Label>MCP Skills</Label>
							<ul className="list-none space-y-2" aria-label="MCP skills">
								{localSkills.map((skill) => (
									<li key={skill.id} className="flex items-start gap-3">
										<Checkbox
											id={`skill-${skill.id}`}
											checked={selectedSkillIds.includes(skill.id)}
											onCheckedChange={(checked) =>
												handleSkillToggle(skill.id, checked === true)
											}
											aria-label={`Select ${skill.name}`}
											className="mt-0.5"
										/>
										<label
											htmlFor={`skill-${skill.id}`}
											className="cursor-pointer"
										>
											<span className="text-sm font-medium">{skill.name}</span>
											<p className="text-xs text-muted-foreground">
												{skill.description}
											</p>
										</label>
									</li>
								))}
							</ul>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setSkillSheetOpen(true)}
							>
								<Plus className="size-3.5" />
								Create Skill
							</Button>
						</div>

						<div className="flex items-center gap-3 pt-4 border-t">
							<Button type="button" variant="outline" onClick={handleSaveDraft}>
								Save Draft
							</Button>
							<Button type="button" onClick={handlePublish}>
								Publish
							</Button>
						</div>
					</form>

					{/* Right: Endpoint Preview */}
					<div className="lg:sticky lg:top-6 self-start">
						<EndpointPreview
							name={name}
							endpointSlug={endpointSlug}
							selectedSkills={selectedSkills}
						/>
					</div>
				</div>
			</div>

			<MCPSkillSheet
				open={skillSheetOpen}
				onOpenChange={setSkillSheetOpen}
				onSave={handleSkillCreate}
			/>
		</ProLayout>
	);
}
