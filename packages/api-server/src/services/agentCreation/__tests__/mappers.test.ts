import { describe, expect, it } from "vitest";
import { agentConfigToApiData, apiDataToAgentConfig } from "../mappers.js";

describe("apiDataToAgentConfig", () => {
	const baseApiData = {
		id: 1,
		eid: "abc-123",
		name: "Test Agent",
		description: "A test agent",
		markdown_text: "Be helpful",
		active: true,
		configs: { ui: { icon: "headphones", icon_color: "blue" } },
		conversation_starters: ["Hello", "How can I help?"],
		guardrails: ["No HR topics", "No salary info"],
		sys_date_created: "2026-01-01T00:00:00.000Z",
		sys_date_updated: "2026-01-02T00:00:00.000Z",
	};

	it("should map conversation_starters from API data", () => {
		const result = apiDataToAgentConfig(baseApiData);
		expect(result.conversationStarters).toEqual(["Hello", "How can I help?"]);
	});

	it("should map guardrails from API data", () => {
		const result = apiDataToAgentConfig(baseApiData);
		expect(result.guardrails).toEqual(["No HR topics", "No salary info"]);
	});

	it("should default conversationStarters to [] when null", () => {
		const result = apiDataToAgentConfig({
			...baseApiData,
			conversation_starters: null,
		});
		expect(result.conversationStarters).toEqual([]);
	});

	it("should default guardrails to [] when null", () => {
		const result = apiDataToAgentConfig({
			...baseApiData,
			guardrails: null,
		});
		expect(result.guardrails).toEqual([]);
	});

	it("should default conversationStarters to [] when missing", () => {
		const { conversation_starters: _, ...withoutStarters } = baseApiData;
		const result = apiDataToAgentConfig(withoutStarters);
		expect(result.conversationStarters).toEqual([]);
	});

	it("should default guardrails to [] when missing", () => {
		const { guardrails: __, ...withoutGuardrails } = baseApiData;
		const result = apiDataToAgentConfig(withoutGuardrails);
		expect(result.guardrails).toEqual([]);
	});

	it("should map core fields correctly", () => {
		const result = apiDataToAgentConfig(baseApiData, ["skill-1"]);
		expect(result).toMatchObject({
			id: "abc-123",
			name: "Test Agent",
			description: "A test agent",
			instructions: "Be helpful",
			status: "published",
			iconId: "headphones",
			iconColorId: "blue",
			skills: ["skill-1"],
		});
	});

	it("should map inactive agent to draft status", () => {
		const result = apiDataToAgentConfig({ ...baseApiData, active: false });
		expect(result.status).toBe("draft");
	});
});

describe("agentConfigToApiData", () => {
	it("should map status to active boolean", () => {
		const result = agentConfigToApiData({ status: "published" });
		expect(result.active).toBe(true);
	});

	it("should map draft status to active false", () => {
		const result = agentConfigToApiData({ status: "draft" });
		expect(result.active).toBe(false);
	});

	it("should pack icon fields into configs.ui", () => {
		const result = agentConfigToApiData({
			iconId: "headphones",
			iconColorId: "blue",
		});
		expect(result.configs).toEqual({
			ui: { icon: "headphones", icon_color: "blue" },
		});
	});

	it("should pass through other fields", () => {
		const result = agentConfigToApiData({ name: "My Agent" });
		expect(result.name).toBe("My Agent");
	});
});
