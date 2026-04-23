/**
 * Pure helpers for diffing an edit-form AgentConfig against its baseline
 * (the original server-loaded version) and for checking consistency between
 * skill removals and the instructions text.
 *
 * Separate from any component / store so they can be unit-tested in isolation
 * and reused by the AgentBuilderPage save router.
 */

import type { AgentConfig } from "@/types/agent";

/**
 * Fields whose changes can be persisted via a direct PUT /api/agents/:eid —
 * no meta-agent run required. These map 1:1 to AgentMetadataApiData columns
 * that AgenticService.updateAgent() handles today.
 */
export const CHEAP_FIELDS = [
	"name",
	"description",
	"iconId",
	"iconColorId",
	"conversationStarters",
	"guardrails",
] as const;

/**
 * Fields whose changes require running AgentRitaDeveloper. Instructions carry
 * per-task goal/backstory/task/expected_output blocks (Phase 0) and skills
 * drive the tasks' `tools` arrays, so any edit here needs the meta-agent to
 * translate form state into PUT/POST/DELETE on /agents/tasks and /tools/.
 */
export const EXPENSIVE_FIELDS = ["instructions", "skills"] as const;

export type CheapField = (typeof CHEAP_FIELDS)[number];
export type ExpensiveField = (typeof EXPENSIVE_FIELDS)[number];

export interface AgentConfigDiff {
	cheapFields: CheapField[];
	expensiveFields: ExpensiveField[];
	hasChanges: boolean;
}

function sameStringList(a: readonly string[], b: readonly string[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

function normalizeSkills(config: AgentConfig): string[] {
	return (config.skills ?? config.tools ?? []).filter(Boolean);
}

/**
 * Classify which fields differ between the current form values and the
 * baseline (original server-loaded config). `hasChanges` is true if either
 * bucket is non-empty.
 */
export function diffAgentConfig(
	current: AgentConfig,
	baseline: AgentConfig,
): AgentConfigDiff {
	const cheapFields: CheapField[] = [];
	const expensiveFields: ExpensiveField[] = [];

	if ((current.name ?? "") !== (baseline.name ?? "")) cheapFields.push("name");
	if ((current.description ?? "") !== (baseline.description ?? "")) {
		cheapFields.push("description");
	}
	if ((current.iconId ?? "") !== (baseline.iconId ?? "")) {
		cheapFields.push("iconId");
	}
	if ((current.iconColorId ?? "") !== (baseline.iconColorId ?? "")) {
		cheapFields.push("iconColorId");
	}
	if (
		!sameStringList(
			current.conversationStarters ?? [],
			baseline.conversationStarters ?? [],
		)
	) {
		cheapFields.push("conversationStarters");
	}
	if (!sameStringList(current.guardrails ?? [], baseline.guardrails ?? [])) {
		cheapFields.push("guardrails");
	}

	if ((current.instructions ?? "") !== (baseline.instructions ?? "")) {
		expensiveFields.push("instructions");
	}
	if (!sameStringList(normalizeSkills(current), normalizeSkills(baseline))) {
		expensiveFields.push("skills");
	}

	return {
		cheapFields,
		expensiveFields,
		hasChanges: cheapFields.length > 0 || expensiveFields.length > 0,
	};
}

export interface SkillReferencesValidation {
	valid: boolean;
	removedSkills: string[];
	/**
	 * Translation key and params. The caller interpolates via i18next so this
	 * helper stays pure and testable.
	 */
	messageKey?: string;
	messageParams?: Record<string, string>;
}

/**
 * If the user removed a skill from the skills list but didn't edit the
 * instructions text, flag it — the instructions almost certainly reference
 * the removed skill and leaving them untouched produces an incoherent agent.
 *
 * Asymmetric on purpose: adding a skill is fine (new capability you might
 * reference later). Removing one without touching instructions is not.
 */
export function validateSkillReferences(
	current: AgentConfig,
	baseline: AgentConfig,
): SkillReferencesValidation {
	const currentSkills = new Set(normalizeSkills(current));
	const baselineSkills = normalizeSkills(baseline);
	const removedSkills = baselineSkills.filter((s) => !currentSkills.has(s));

	if (removedSkills.length === 0) {
		return { valid: true, removedSkills: [] };
	}
	if ((current.instructions ?? "") !== (baseline.instructions ?? "")) {
		return { valid: true, removedSkills };
	}

	return {
		valid: false,
		removedSkills,
		messageKey: "builder.skillsRemovedInstructionsUnchanged",
		messageParams: { skills: removedSkills.join(", ") },
	};
}
