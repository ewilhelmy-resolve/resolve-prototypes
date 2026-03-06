import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ProLayout } from "@/components/layouts/ProLayout";
import { EndpointPreview } from "@/components/pro/EndpointPreview";
import { MCPSkillSheet } from "@/components/pro/MCPSkillSheet";
import { ProSubNav } from "@/components/pro/ProSubNav";
import { Badge } from "@/components/ui/badge";
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
	MOCK_PRO_RUNBOOKS,
} from "@/data/mock-pro";
import type { MCPAuthMethod, MCPSkill, ProAgentVersion } from "@/types/pro";

const NONE_RUNBOOK = "__none__";

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

	// Version state — latest version selected by default
	const [versions, setVersions] = useState<ProAgentVersion[]>(
		existingAgent?.versions ?? [],
	);
	const [activeVersion, setActiveVersion] = useState(
		existingAgent?.activeVersion ?? 1,
	);
	const latestVersion = versions.length > 0 ? versions[versions.length - 1] : undefined;
	const [selectedVersion, setSelectedVersion] = useState(
		latestVersion?.version ?? 1,
	);
	const currentVersion = versions.find((v) => v.version === selectedVersion);

	// Form state — initialized from latest version or agent
	const [name, setName] = useState(
		latestVersion?.name ?? existingAgent?.name ?? "",
	);
	const [description, setDescription] = useState(
		latestVersion?.description ?? existingAgent?.description ?? "",
	);
	const [endpointSlug, setEndpointSlug] = useState(
		latestVersion?.endpointSlug ?? existingAgent?.endpointSlug ?? "",
	);
	const [runbookId, setRunbookId] = useState(
		latestVersion?.runbookId ?? existingAgent?.runbookId ?? NONE_RUNBOOK,
	);
	const [authMethod, setAuthMethod] = useState<MCPAuthMethod>(
		latestVersion?.authMethod ?? existingAgent?.authMethod ?? "none",
	);
	const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
		latestVersion?.skillIds ?? existingAgent?.skillIds ?? [],
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

	// Load version config when switching versions
	const handleVersionChange = (versionNum: string) => {
		const num = Number(versionNum);
		setSelectedVersion(num);
		const ver = versions.find((v) => v.version === num);
		if (ver) {
			setName(ver.name);
			setDescription(ver.description);
			setEndpointSlug(ver.endpointSlug);
			setRunbookId(ver.runbookId ?? NONE_RUNBOOK);
			setAuthMethod(ver.authMethod ?? "none");
			setSelectedSkillIds([...ver.skillIds]);
			slugManuallyEdited.current = true;
		}
	};

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
		runbookId: runbookId === NONE_RUNBOOK ? null : runbookId,
		authMethod,
		skillIds: selectedSkillIds,
	});

	const handleSaveDraft = () => {
		console.log("Save draft:", assembleAgent());
	};

	const handlePublish = () => {
		const now = new Date().toISOString();
		const nextVersion = versions.length > 0
			? Math.max(...versions.map((v) => v.version)) + 1
			: 1;
		const newVersion: ProAgentVersion = {
			version: nextVersion,
			name,
			description,
			endpointSlug,
			runbookId: runbookId === NONE_RUNBOOK ? null : runbookId,
			authMethod,
			skillIds: [...selectedSkillIds],
			status: "active",
			createdAt: now,
			updatedAt: now,
		};
		setVersions((prev) => [...prev, newVersion]);
		setActiveVersion(nextVersion);
		setSelectedVersion(nextVersion);
		console.log("Publish — new version:", newVersion);
	};

	const selectedSkills = localSkills.filter((s) =>
		selectedSkillIds.includes(s.id),
	);

	return (
		<ProLayout>
			<ProSubNav />
			<div className="p-6">
				<div className="flex items-center gap-3 mb-6">
					<h1 className="text-2xl font-bold">
						{isEdit ? "Edit Dynamic MCP" : "Create Dynamic MCP"}
					</h1>
					{isEdit && versions.length > 0 && (
						<Select
							value={String(selectedVersion)}
							onValueChange={handleVersionChange}
						>
							<SelectTrigger className="w-28" aria-label="Select version">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{versions.map((v) => (
									<SelectItem key={v.version} value={String(v.version)}>
										<span className="flex items-center gap-1.5">
											v{v.version}
											{v.version === activeVersion && (
												<Badge variant="secondary" className="text-[10px] px-1 py-0 leading-tight">
													Live
												</Badge>
											)}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Left: MCP Config */}
					<form
						className="space-y-5"
						onSubmit={(e) => e.preventDefault()}
						aria-label={isEdit ? "Edit dynamic MCP" : "Create dynamic MCP"}
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
							<Label htmlFor="agent-runbook">Runbook</Label>
							<Select value={runbookId} onValueChange={setRunbookId}>
								<SelectTrigger id="agent-runbook">
									<SelectValue placeholder="Select a runbook" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NONE_RUNBOOK}>None</SelectItem>
									{MOCK_PRO_RUNBOOKS.map((rb) => (
										<SelectItem key={rb.id} value={rb.id}>
											{rb.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="agent-auth">Authentication</Label>
							<Select
								value={authMethod}
								onValueChange={(v) => setAuthMethod(v as MCPAuthMethod)}
							>
								<SelectTrigger id="agent-auth">
									<SelectValue placeholder="Select authentication" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									<SelectItem value="oauth">OAuth</SelectItem>
									<SelectItem value="api_key">API Key</SelectItem>
									<SelectItem value="bearer">Bearer Token</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{authMethod === "oauth" && (
							<div className="space-y-3 rounded-md border p-4">
								<div className="space-y-1.5">
									<Label htmlFor="oauth-client-id">Client ID</Label>
									<Input id="oauth-client-id" placeholder="Enter client ID" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="oauth-client-secret">Client Secret</Label>
									<Input id="oauth-client-secret" type="password" placeholder="Enter client secret" />
								</div>
							</div>
						)}

						{authMethod === "api_key" && (
							<div className="space-y-1.5 rounded-md border p-4">
								<Label htmlFor="auth-api-key">API Key</Label>
								<Input id="auth-api-key" type="password" placeholder="Enter API key" />
							</div>
						)}

						{authMethod === "bearer" && (
							<div className="space-y-1.5 rounded-md border p-4">
								<Label htmlFor="auth-bearer-token">Bearer Token</Label>
								<Input id="auth-bearer-token" type="password" placeholder="Enter bearer token" />
							</div>
						)}

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
