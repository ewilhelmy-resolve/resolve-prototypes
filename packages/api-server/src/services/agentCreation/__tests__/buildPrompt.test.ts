import { describe, expect, it } from "vitest";
import { buildAgentPrompt } from "../buildPrompt.js";
import type { AgentGenerateParams } from "../types.js";

// Cheap/deterministic fields (name, description, icons, starters, guardrails,
// admin_type, tenant, audit) are RITA-owned and written directly via
// POST/PUT /agents/metadata before the meta-agent runs. They MUST NOT appear
// in the prompt — the meta-agent has nothing to do with them.
const SHELL_EID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const baseParams: AgentGenerateParams = {
	name: "IT Help Desk",
	description: "Handles IT tickets",
	instructions: "Be helpful and friendly",
	iconId: "headphones",
	iconColorId: "blue",
	conversationStarters: ["How can I help?"],
	guardrails: ["No HR topics"],
	targetAgentEid: SHELL_EID,
	shellAlreadyCreated: true,
	userId: "user-1",
	userEmail: "test@example.com",
	organizationId: "org-1",
};

describe("buildAgentPrompt", () => {
	describe("expensive-only payload — cheap fields are stripped", () => {
		it("includes the instructions under an Instructions heading", () => {
			const prompt = buildAgentPrompt(baseParams);
			expect(prompt).toContain("Instructions:");
			expect(prompt).toContain("Be helpful and friendly");
		});

		it("does NOT embed any cheap metadata fields", () => {
			const prompt = buildAgentPrompt(baseParams);
			// Name / description / starters / guardrails / icons / admin_type
			// are RITA-owned — the meta-agent must not see them as prompt input.
			expect(prompt).not.toContain("Name: IT Help Desk");
			expect(prompt).not.toContain("Description:");
			expect(prompt).not.toContain("Handles IT tickets");
			expect(prompt).not.toContain("Conversation Starters:");
			expect(prompt).not.toContain("How can I help?");
			// "Guardrails" (the word) still appears in the "DO NOT patch
			// agent_metadata" directive — we just make sure the user's
			// guardrail bullet itself is not in there.
			expect(prompt).not.toContain("- No HR topics");
			expect(prompt).not.toContain("Type:");
			expect(prompt).not.toContain("Role:");
		});

		it("includes runtime parameter requirements with {%utterance}", () => {
			const prompt = buildAgentPrompt(baseParams);
			expect(prompt).toContain("{%utterance}");
			expect(prompt).toContain("{%transcript}");
			expect(prompt).toContain("{%additional_information}");
			expect(prompt).toContain("MUST process {%utterance}");
		});

		it("includes the runtime-parameter block even when instructions is empty", () => {
			const minimalParams: AgentGenerateParams = {
				name: "Minimal Agent",
				description: "",
				instructions: "",
				iconId: "bot",
				iconColorId: "slate",
				targetAgentEid: SHELL_EID,
				shellAlreadyCreated: true,
				userId: "user-1",
				userEmail: "test@example.com",
				organizationId: "org-1",
			};
			const prompt = buildAgentPrompt(minimalParams);
			expect(prompt).toContain("{%utterance}");
			expect(prompt).not.toContain("Instructions:");
		});

		it("throws when targetAgentEid is missing (meta-agent runs in UPDATE mode only)", () => {
			const noEid = { ...baseParams, targetAgentEid: undefined };
			expect(() => buildAgentPrompt(noEid)).toThrow(
				/targetAgentEid is required/,
			);
		});
	});

	describe("user-initiated UPDATE — shellAlreadyCreated false", () => {
		const userUpdateParams: AgentGenerateParams = {
			...baseParams,
			shellAlreadyCreated: false,
		};

		it("prefixes the prompt with a Mode: UPDATE existing agent line naming the EID", () => {
			const prompt = buildAgentPrompt(userUpdateParams);
			expect(
				prompt.startsWith(
					`Mode: UPDATE existing agent (target_agent_eid=${SHELL_EID}).`,
				),
			).toBe(true);
		});

		it("tells the meta-agent that metadata is already applied and it should only touch tasks", () => {
			const prompt = buildAgentPrompt(userUpdateParams);
			expect(prompt).toContain("RITA has already applied any metadata changes");
			expect(prompt).toContain("DO NOT patch agent_metadata");
			expect(prompt).not.toContain("Mode: UPDATE shell");
		});

		it("appends User change request section when updatePrompt is provided", () => {
			const prompt = buildAgentPrompt({
				...userUpdateParams,
				updatePrompt: "tighten guardrails and rewrite description",
			});
			expect(prompt).toContain("User change request:");
			expect(prompt).toContain("tighten guardrails and rewrite description");
		});

		it("omits User change request section when updatePrompt is empty/whitespace", () => {
			const prompt = buildAgentPrompt({
				...userUpdateParams,
				updatePrompt: "   ",
			});
			expect(prompt).not.toContain("User change request:");
		});

		it("omits User change request section when updatePrompt is missing", () => {
			const prompt = buildAgentPrompt(userUpdateParams);
			expect(prompt).not.toContain("User change request:");
		});

		it("trims whitespace around updatePrompt before appending", () => {
			const prompt = buildAgentPrompt({
				...userUpdateParams,
				updatePrompt: "\n\n  do the thing  \n\n",
			});
			expect(prompt).toContain("User change request:\ndo the thing");
			expect(prompt).not.toContain("do the thing  ");
		});
	});

	describe("shell-first UPDATE — shellAlreadyCreated true", () => {
		it("uses the UPDATE shell marker instead of UPDATE existing agent", () => {
			const prompt = buildAgentPrompt(baseParams);
			expect(prompt).toContain(
				`Mode: UPDATE shell (target_agent_eid=${SHELL_EID})`,
			);
			expect(prompt).not.toContain("Mode: UPDATE existing agent");
		});

		it("tells the meta-agent to generate sub-tasks and skip metadata patches", () => {
			const prompt = buildAgentPrompt(baseParams);
			expect(prompt).toContain("ai_create_new_agent_task");
			expect(prompt).toContain("DO NOT patch agent_metadata");
			expect(prompt).toContain("Shell was just created by RITA");
		});

		it("still appends User change request section when updatePrompt is provided", () => {
			const prompt = buildAgentPrompt({
				...baseParams,
				updatePrompt: "add a starter for troubleshooting",
			});
			expect(prompt).toContain("User change request:");
			expect(prompt).toContain("add a starter for troubleshooting");
		});
	});
});
