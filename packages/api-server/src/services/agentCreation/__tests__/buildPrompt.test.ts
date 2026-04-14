import { describe, expect, it } from "vitest";
import { buildAgentPrompt } from "../buildPrompt.js";
import type { AgentGenerateParams } from "../types.js";

const baseParams: AgentGenerateParams = {
	name: "IT Help Desk",
	description: "Handles IT tickets",
	instructions: "Be helpful and friendly",
	iconId: "headphones",
	iconColorId: "blue",
	conversationStarters: ["How can I help?"],
	guardrails: ["No HR topics"],
	userId: "user-1",
	userEmail: "test@example.com",
	organizationId: "org-1",
};

// Note: role, agentType, knowledgeSources, workflows, capabilities
// are intentionally NOT in AgentGenerateParams — they don't exist in the builder form

describe("buildAgentPrompt", () => {
	it("should include name, instructions, description", () => {
		const prompt = buildAgentPrompt(baseParams);
		expect(prompt).toContain("Name: IT Help Desk");
		expect(prompt).toContain("Instructions:");
		expect(prompt).toContain("Be helpful and friendly");
		expect(prompt).toContain("Description:");
		expect(prompt).toContain("Handles IT tickets");
	});

	it("should include conversation starters", () => {
		const prompt = buildAgentPrompt(baseParams);
		expect(prompt).toContain("Conversation Starters:");
		expect(prompt).toContain("- How can I help?");
	});

	it("should include guardrails", () => {
		const prompt = buildAgentPrompt(baseParams);
		expect(prompt).toContain("Guardrails");
		expect(prompt).toContain("- No HR topics");
	});

	it("should NOT include agentType field", () => {
		const prompt = buildAgentPrompt(baseParams);
		expect(prompt).not.toContain("Type:");
	});

	it("should NOT include role field", () => {
		const prompt = buildAgentPrompt(baseParams);
		expect(prompt).not.toContain("Role:");
	});

	it("should NOT include knowledgeSources, workflows, webSearch, or useAllWorkspaceContent", () => {
		const prompt = buildAgentPrompt(baseParams);
		expect(prompt).not.toContain("Knowledge Sources");
		expect(prompt).not.toContain("Workflows");
		expect(prompt).not.toContain("Web Search");
		expect(prompt).not.toContain("useAllWorkspaceContent");
	});
});
