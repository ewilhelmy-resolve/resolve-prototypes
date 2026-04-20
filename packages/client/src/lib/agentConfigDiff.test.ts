import { describe, expect, it } from "vitest";
import type { AgentConfig } from "@/types/agent";
import { diffAgentConfig, validateSkillReferences } from "./agentConfigDiff";

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
	return {
		id: "agent-1",
		name: "Test Agent",
		description: "desc",
		instructions: "Be helpful",
		role: "",
		iconId: "bot",
		iconColorId: "slate",
		agentType: null,
		conversationStarters: [],
		knowledgeSources: [],
		tools: [],
		skills: [],
		guardrails: [],
		capabilities: {
			webSearch: true,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
		...overrides,
	};
}

describe("diffAgentConfig", () => {
	it("reports no changes when baseline and current match", () => {
		const baseline = makeConfig();
		const diff = diffAgentConfig(baseline, baseline);
		expect(diff.hasChanges).toBe(false);
		expect(diff.cheapFields).toEqual([]);
		expect(diff.expensiveFields).toEqual([]);
	});

	describe("cheap fields", () => {
		it("flags name changes", () => {
			const baseline = makeConfig({ name: "A" });
			const current = makeConfig({ name: "B" });
			expect(diffAgentConfig(current, baseline).cheapFields).toContain("name");
		});

		it("flags description changes", () => {
			const baseline = makeConfig({ description: "old" });
			const current = makeConfig({ description: "new" });
			expect(diffAgentConfig(current, baseline).cheapFields).toContain(
				"description",
			);
		});

		it("flags iconId and iconColorId changes independently", () => {
			const baseline = makeConfig({ iconId: "bot", iconColorId: "slate" });
			const diff1 = diffAgentConfig(
				makeConfig({ iconId: "headphones", iconColorId: "slate" }),
				baseline,
			);
			expect(diff1.cheapFields).toEqual(["iconId"]);

			const diff2 = diffAgentConfig(
				makeConfig({ iconId: "bot", iconColorId: "blue" }),
				baseline,
			);
			expect(diff2.cheapFields).toEqual(["iconColorId"]);
		});

		it("flags conversationStarters changes (add / remove / reorder)", () => {
			const baseline = makeConfig({ conversationStarters: ["a", "b"] });
			const added = diffAgentConfig(
				makeConfig({ conversationStarters: ["a", "b", "c"] }),
				baseline,
			);
			expect(added.cheapFields).toContain("conversationStarters");
			const removed = diffAgentConfig(
				makeConfig({ conversationStarters: ["a"] }),
				baseline,
			);
			expect(removed.cheapFields).toContain("conversationStarters");
			const reordered = diffAgentConfig(
				makeConfig({ conversationStarters: ["b", "a"] }),
				baseline,
			);
			expect(reordered.cheapFields).toContain("conversationStarters");
		});

		it("flags guardrails changes", () => {
			const baseline = makeConfig({ guardrails: ["no HR"] });
			const current = makeConfig({ guardrails: ["no HR", "no salary"] });
			expect(diffAgentConfig(current, baseline).cheapFields).toContain(
				"guardrails",
			);
		});
	});

	describe("expensive fields", () => {
		it("flags instructions changes", () => {
			const baseline = makeConfig({ instructions: "old" });
			const current = makeConfig({ instructions: "new" });
			expect(diffAgentConfig(current, baseline).expensiveFields).toContain(
				"instructions",
			);
		});

		it("flags skills changes (prefers skills over tools)", () => {
			const baseline = makeConfig({ skills: ["tool-a"], tools: [] });
			const current = makeConfig({ skills: ["tool-a", "tool-b"], tools: [] });
			expect(diffAgentConfig(current, baseline).expensiveFields).toContain(
				"skills",
			);
		});

		it("falls back to tools when skills is undefined", () => {
			const baseline = makeConfig({ skills: undefined, tools: ["a"] });
			const current = makeConfig({ skills: undefined, tools: ["a", "b"] });
			expect(diffAgentConfig(current, baseline).expensiveFields).toContain(
				"skills",
			);
		});
	});

	it("reports both buckets when mixed changes exist", () => {
		const baseline = makeConfig({ name: "A", instructions: "old", skills: [] });
		const current = makeConfig({
			name: "B",
			description: "added",
			instructions: "new",
			skills: ["x"],
		});
		const diff = diffAgentConfig(current, baseline);
		expect(diff.hasChanges).toBe(true);
		expect(diff.cheapFields.sort()).toEqual(["description", "name"]);
		expect(diff.expensiveFields.sort()).toEqual(["instructions", "skills"]);
	});
});

describe("validateSkillReferences", () => {
	it("passes when no skills were removed", () => {
		const baseline = makeConfig({ skills: ["a"], instructions: "x" });
		const current = makeConfig({ skills: ["a", "b"], instructions: "x" });
		const v = validateSkillReferences(current, baseline);
		expect(v.valid).toBe(true);
		expect(v.removedSkills).toEqual([]);
	});

	it("fails when skills are removed and instructions are unchanged", () => {
		const baseline = makeConfig({
			skills: ["find_user", "send_email"],
			instructions: "Use find_user to look up customers.",
		});
		const current = makeConfig({
			skills: ["send_email"],
			instructions: "Use find_user to look up customers.",
		});
		const v = validateSkillReferences(current, baseline);
		expect(v.valid).toBe(false);
		expect(v.removedSkills).toEqual(["find_user"]);
		expect(v.messageKey).toBe("builder.skillsRemovedInstructionsUnchanged");
		expect(v.messageParams).toEqual({ skills: "find_user" });
	});

	it("passes when skills are removed AND instructions were revised", () => {
		const baseline = makeConfig({
			skills: ["find_user", "send_email"],
			instructions: "Use find_user to look up customers.",
		});
		const current = makeConfig({
			skills: ["send_email"],
			instructions: "Rely on the send_email tool only.",
		});
		const v = validateSkillReferences(current, baseline);
		expect(v.valid).toBe(true);
		expect(v.removedSkills).toEqual(["find_user"]);
	});

	it("lists multiple removed skills in the message params", () => {
		const baseline = makeConfig({
			skills: ["a", "b", "c"],
			instructions: "same",
		});
		const current = makeConfig({ skills: ["b"], instructions: "same" });
		const v = validateSkillReferences(current, baseline);
		expect(v.valid).toBe(false);
		expect(v.removedSkills).toEqual(["a", "c"]);
		expect(v.messageParams?.skills).toBe("a, c");
	});
});
