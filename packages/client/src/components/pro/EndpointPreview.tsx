import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copyToClipboard } from "@/lib/utils";
import type { MCPSkill, MCPVariable, MCPVariableType } from "@/types/pro";

interface EndpointPreviewProps {
	name: string;
	endpointSlug: string;
	selectedSkills: MCPSkill[];
}

/** Placeholder value per variable type for curl example */
function placeholderForType(type: MCPVariableType): string {
	switch (type) {
		case "string":
			return '"..."';
		case "number":
			return "0";
		case "boolean":
			return "false";
		case "object":
			return "{}";
		case "array":
			return "[]";
	}
}

/** Collect required variables from selected skills, deduplicated by name */
function getRequiredVariables(
	skills: MCPSkill[],
): { name: string; type: MCPVariableType }[] {
	const seen = new Set<string>();
	const result: { name: string; type: MCPVariableType }[] = [];

	for (const skill of skills) {
		for (const v of skill.variables) {
			if (v.required && !seen.has(v.name)) {
				seen.add(v.name);
				result.push({ name: v.name, type: v.type });
			}
		}
	}

	return result;
}

/** Collect all variables grouped by skill, deduplicated within each group */
function getVariablesBySkill(
	skills: MCPSkill[],
): { skillName: string; variables: MCPVariable[] }[] {
	const globalSeen = new Set<string>();

	return skills
		.map((skill) => {
			const unique = skill.variables.filter((v) => {
				if (globalSeen.has(v.name)) return false;
				globalSeen.add(v.name);
				return true;
			});
			return { skillName: skill.name, variables: unique };
		})
		.filter((group) => group.variables.length > 0);
}

/** Build the curl example string */
function buildCurlExample(slug: string, skills: MCPSkill[]): string {
	const path = slug || "...";
	const required = getRequiredVariables(skills);

	const bodyLines = required.map(
		(v, i) =>
			`    "${v.name}": ${placeholderForType(v.type)}${i < required.length - 1 ? "," : ""}`,
	);

	const body = bodyLines.length > 0 ? `{\n${bodyLines.join("\n")}\n  }` : "{}";

	return [
		"curl -X POST \\",
		`  https://api.resolve.ai/v1/agents/${path}/run \\`,
		'  -H "Authorization: Bearer <api-key>" \\',
		'  -H "Content-Type: application/json" \\',
		`  -d '${body}'`,
	].join("\n");
}

export function EndpointPreview({
	name: _name,
	endpointSlug,
	selectedSkills,
}: EndpointPreviewProps) {
	const [copied, setCopied] = useState(false);

	const curlExample = buildCurlExample(endpointSlug, selectedSkills);
	const variableGroups = getVariablesBySkill(selectedSkills);
	const displayPath = endpointSlug
		? `/api/v1/agents/${endpointSlug}/run`
		: "/api/v1/agents/.../run";

	const handleCopy = useCallback(async () => {
		await copyToClipboard(curlExample);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [curlExample]);

	return (
		<Card>
			{/* Endpoint URL */}
			<CardHeader>
				<CardTitle className="text-sm">Endpoint</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center gap-2">
				<Badge className="bg-emerald-600 text-white hover:bg-emerald-600 shrink-0">
					POST
				</Badge>
				<code
					className={`font-mono text-sm break-all ${endpointSlug ? "text-foreground" : "text-muted-foreground"}`}
				>
					{displayPath}
				</code>
			</CardContent>

			{/* curl Example */}
			<CardHeader>
				<CardTitle className="text-sm">curl Example</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="relative rounded-lg bg-slate-900 p-4 overflow-x-auto">
					<button
						type="button"
						onClick={handleCopy}
						className="absolute top-3 right-3 flex items-center justify-center size-8 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
						aria-label={copied ? "Copied to clipboard" : "Copy curl example"}
					>
						{copied ? (
							<Check className="size-4" aria-hidden="true" />
						) : (
							<Copy className="size-4" aria-hidden="true" />
						)}
					</button>
					<pre className="font-mono text-sm text-slate-100 whitespace-pre leading-relaxed pr-10">
						{curlExample}
					</pre>
				</div>
			</CardContent>

			{/* Variables */}
			<CardHeader>
				<CardTitle className="text-sm">Variables</CardTitle>
			</CardHeader>
			<CardContent>
				{variableGroups.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Select skills to see their variables.
					</p>
				) : (
					<div className="space-y-4">
						{variableGroups.map((group) => (
							<div key={group.skillName}>
								<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
									{group.skillName}
								</h4>
								<ul className="space-y-1.5">
									{group.variables.map((v) => (
										<li
											key={v.name}
											className="flex items-center gap-2 text-sm"
										>
											<code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
												{v.name}
											</code>
											<span className="text-muted-foreground text-xs">
												({v.type})
											</span>
											<Badge
												variant={v.required ? "default" : "secondary"}
												className="text-[10px] px-1.5 py-0"
											>
												{v.required ? "required" : "optional"}
											</Badge>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
