import { describe, expect, it } from "vitest";
import type { AgentTaskApiData } from "../../AgenticService.js";
import { agentConfigToApiData, apiDataToAgentConfig } from "../mappers.js";

function makeTask(overrides: Partial<AgentTaskApiData> = {}): AgentTaskApiData {
	return {
		id: null,
		eid: null,
		name: "task_name",
		agent_metadata_id: "agent-eid",
		role: "Role",
		description: null,
		goal: "Goal",
		backstory: "Backstory",
		task: "Task body",
		expected_output: "Expected",
		tools: [],
		depends_on_tasks: null,
		configs: null,
		order: null,
		active: true,
		tenant: null,
		sys_date_created: null,
		sys_date_updated: null,
		sys_created_by: null,
		sys_updated_by: null,
		...overrides,
	};
}

describe("apiDataToAgentConfig", () => {
	const baseApiData = {
		id: 1,
		eid: "abc-123",
		name: "Test Agent",
		description: "A test agent",
		markdown_text: "Be helpful",
		active: true,
		state: "PUBLISHED",
		admin_type: "user",
		ui_configs: { icon: "headphones", icon_color: "blue" },
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
		const result = apiDataToAgentConfig(baseApiData);
		expect(result).toMatchObject({
			id: "abc-123",
			name: "Test Agent",
			description: "A test agent",
			instructions: "Be helpful",
			state: "PUBLISHED",
			iconId: "headphones",
			iconColorId: "blue",
			skills: [],
			tools: [],
		});
	});

	it("derives state from the `state` column verbatim", () => {
		const result = apiDataToAgentConfig({ ...baseApiData, state: "DRAFT" });
		expect(result.state).toBe("DRAFT");
	});

	it("defaults state to DRAFT when the column is null/missing", () => {
		const { state: _s, ...row } = baseApiData;
		const result = apiDataToAgentConfig(row);
		expect(result.state).toBe("DRAFT");
	});

	it("defaults state to DRAFT when the column holds an unknown value", () => {
		const result = apiDataToAgentConfig({ ...baseApiData, state: "WEIRD" });
		expect(result.state).toBe("DRAFT");
	});

	describe("ui_configs + admin_type", () => {
		it("reads icon/color from top-level ui_configs", () => {
			const result = apiDataToAgentConfig(baseApiData);
			expect(result.iconId).toBe("headphones");
			expect(result.iconColorId).toBe("blue");
		});

		it("falls back to legacy configs.ui when ui_configs is absent", () => {
			const { ui_configs: _, ...legacyRow } = baseApiData;
			const result = apiDataToAgentConfig({
				...legacyRow,
				configs: { ui: { icon: "terminal", icon_color: "emerald" } },
			});
			expect(result.iconId).toBe("terminal");
			expect(result.iconColorId).toBe("emerald");
		});

		it("defaults to bot/slate when no icon info anywhere", () => {
			const { ui_configs: _u, ...row } = baseApiData;
			const result = apiDataToAgentConfig(row);
			expect(result.iconId).toBe("bot");
			expect(result.iconColorId).toBe("slate");
		});

		it("prefers ui_configs over legacy configs.ui when both present", () => {
			const result = apiDataToAgentConfig({
				...baseApiData,
				configs: { ui: { icon: "old", icon_color: "old_color" } },
			});
			expect(result.iconId).toBe("headphones");
			expect(result.iconColorId).toBe("blue");
		});

		it("reads admin_type, defaulting to 'user' when null", () => {
			const result = apiDataToAgentConfig(baseApiData);
			expect(result.adminType).toBe("user");
			const withoutAdmin = apiDataToAgentConfig({
				...baseApiData,
				admin_type: null,
			});
			expect(withoutAdmin.adminType).toBe("user");
		});

		it("surfaces non-user admin_type verbatim", () => {
			const result = apiDataToAgentConfig({
				...baseApiData,
				admin_type: "system",
			});
			expect(result.adminType).toBe("system");
		});
	});

	describe("instructions composition from tasks", () => {
		it("returns markdown_text as-is when no tasks provided", () => {
			const result = apiDataToAgentConfig(baseApiData);
			expect(result.instructions).toBe("Be helpful");
		});

		it("returns empty string when neither markdown_text nor tasks exist", () => {
			const result = apiDataToAgentConfig({
				...baseApiData,
				markdown_text: "",
			});
			expect(result.instructions).toBe("");
		});

		it("appends a single task block after markdown_text", () => {
			const task = makeTask({
				name: "greet",
				role: "Greeter",
				goal: "Say hello",
				backstory: "Friendly assistant",
				task: "Greet the user",
				expected_output: "A greeting",
				tools: ["Wave", "Smile"],
			});
			const result = apiDataToAgentConfig(baseApiData, [task]);
			expect(result.instructions).toBe(
				[
					"Be helpful",
					"",
					"---",
					"",
					"## Task: greet",
					"**Role:** Greeter",
					"",
					"**Goal:** Say hello",
					"",
					"**Backstory:** Friendly assistant",
					"",
					"**Task:** Greet the user",
					"",
					"**Expected Output:** A greeting",
					"",
					"**Tools:** Wave, Smile",
				].join("\n"),
			);
		});

		it("renders task block alone when markdown_text is empty", () => {
			const task = makeTask({ name: "solo", role: "R" });
			const result = apiDataToAgentConfig(
				{ ...baseApiData, markdown_text: "" },
				[task],
			);
			expect(result.instructions).toContain("## Task: solo");
			expect(result.instructions?.toString().startsWith("## Task: solo")).toBe(
				true,
			);
		});

		it("orders tasks by `order` ascending, nulls last", () => {
			const tasks = [
				makeTask({ name: "third", order: 3 }),
				makeTask({ name: "no_order_a", order: null }),
				makeTask({ name: "first", order: 1 }),
				makeTask({ name: "no_order_b", order: null }),
				makeTask({ name: "second", order: 2 }),
			];
			const result = apiDataToAgentConfig(baseApiData, tasks);
			const names = (result.instructions as string)
				.split("\n")
				.filter((line) => line.startsWith("## Task: "))
				.map((line) => line.replace("## Task: ", ""));
			expect(names).toEqual([
				"first",
				"second",
				"third",
				"no_order_a",
				"no_order_b",
			]);
		});

		it("separates multiple tasks with a fenced ---", () => {
			const tasks = [
				makeTask({ name: "a", order: 1 }),
				makeTask({ name: "b", order: 2 }),
			];
			const result = apiDataToAgentConfig(baseApiData, tasks);
			const separators = (result.instructions as string).match(/^---$/gm) || [];
			// one between markdown_text and first task, one between tasks
			expect(separators.length).toBe(2);
		});

		it("renders null/missing task fields as empty values without dropping lines", () => {
			const task = makeTask({
				name: "sparse",
				role: null,
				goal: null,
				backstory: null,
				task: null,
				expected_output: null,
				tools: null,
			});
			const result = apiDataToAgentConfig(baseApiData, [task]);
			const instructions = result.instructions as string;
			expect(instructions).toContain("**Role:** ");
			expect(instructions).toContain("**Goal:** ");
			expect(instructions).toContain("**Backstory:** ");
			expect(instructions).toContain("**Task:** ");
			expect(instructions).toContain("**Expected Output:** ");
			expect(instructions).toContain("**Tools:** ");
		});
	});

	describe("tools/skills from tasks", () => {
		it("dedupes tools across tasks, preserves first-seen order", () => {
			const tasks = [
				makeTask({ tools: ["ToolA", "ToolB"] }),
				makeTask({ tools: ["ToolB", "ToolC", "ToolA"] }),
			];
			const result = apiDataToAgentConfig(baseApiData, tasks);
			expect(result.tools).toEqual(["ToolA", "ToolB", "ToolC"]);
			expect(result.skills).toEqual(["ToolA", "ToolB", "ToolC"]);
		});

		it("filters out falsy tool entries", () => {
			const tasks = [makeTask({ tools: ["ToolA", "", "ToolB"] as string[] })];
			const result = apiDataToAgentConfig(baseApiData, tasks);
			expect(result.tools).toEqual(["ToolA", "ToolB"]);
		});

		it("returns empty tools/skills when no tasks provided", () => {
			const result = apiDataToAgentConfig(baseApiData);
			expect(result.tools).toEqual([]);
			expect(result.skills).toEqual([]);
		});

		it("keeps tools and skills identical for backward compat", () => {
			const tasks = [makeTask({ tools: ["X", "Y"] })];
			const result = apiDataToAgentConfig(baseApiData, tasks);
			expect(result.tools).toEqual(result.skills);
		});
	});
});

describe("agentConfigToApiData", () => {
	it("forwards a valid state verbatim", () => {
		const result = agentConfigToApiData({ state: "PUBLISHED" });
		expect(result.state).toBe("PUBLISHED");
		expect(result.active).toBeUndefined();
	});

	it("accepts all four state values", () => {
		for (const s of ["DRAFT", "PUBLISHED", "RETIRED", "TESTING"] as const) {
			expect(agentConfigToApiData({ state: s }).state).toBe(s);
		}
	});

	it("omits state when the caller passes something unknown", () => {
		const result = agentConfigToApiData({ state: "weird" });
		expect(result.state).toBeUndefined();
	});

	it("never writes active", () => {
		const result = agentConfigToApiData({ state: "DRAFT" });
		expect(result.active).toBeUndefined();
	});

	it("writes icon fields to ui_configs, not configs.ui", () => {
		const result = agentConfigToApiData({
			iconId: "headphones",
			iconColorId: "blue",
		});
		expect(result.ui_configs).toEqual({
			icon: "headphones",
			icon_color: "blue",
		});
		expect(result.configs).toBeUndefined();
	});

	it("defaults admin_type to 'user' when not provided", () => {
		const result = agentConfigToApiData({ name: "My Agent" });
		expect(result.admin_type).toBe("user");
	});

	it("passes through admin_type when provided", () => {
		const result = agentConfigToApiData({
			name: "Meta",
			adminType: "system",
		});
		expect(result.admin_type).toBe("system");
	});

	it("should pass through other fields", () => {
		const result = agentConfigToApiData({ name: "My Agent" });
		expect(result.name).toBe("My Agent");
	});

	it("translates camelCase conversationStarters to snake_case conversation_starters", () => {
		const result = agentConfigToApiData({
			name: "Anime Agent",
			conversationStarters: ["What's the latest anime news?"],
		});
		expect(result.conversation_starters).toEqual([
			"What's the latest anime news?",
		]);
		expect(result.conversationStarters).toBeUndefined();
	});

	it("passes guardrails through verbatim", () => {
		const result = agentConfigToApiData({
			name: "A",
			guardrails: ["no PII", "no HR topics"],
		});
		expect(result.guardrails).toEqual(["no PII", "no HR topics"]);
	});
});
