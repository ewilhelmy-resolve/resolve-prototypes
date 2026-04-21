import { describe, expect, it } from "vitest";
import {
	addToolToInstructions,
	removeToolFromInstructions,
	syncAddedToolsInInstructions,
	syncRemovedToolInInstructions,
} from "./agentInstructionsTools";

describe("addToolToInstructions", () => {
	it("creates the section when instructions are empty", () => {
		expect(addToolToInstructions("", "Check Inventory")).toBe(
			"## Tools\n- Check Inventory",
		);
	});

	it("appends the section after existing content", () => {
		const existing = "You are a helpful assistant.\n\nAnswer clearly.";
		expect(addToolToInstructions(existing, "Check Inventory")).toBe(
			`${existing}\n\n## Tools\n- Check Inventory`,
		);
	});

	it("appends a new bullet to an existing section", () => {
		const existing = "## Tools\n- Check Inventory";
		expect(addToolToInstructions(existing, "Update Store Hours")).toBe(
			"## Tools\n- Check Inventory\n- Update Store Hours",
		);
	});

	it("is a no-op if the tool is already listed", () => {
		const existing = "## Tools\n- Check Inventory";
		expect(addToolToInstructions(existing, "Check Inventory")).toBe(existing);
	});

	it("preserves trailing content after the section", () => {
		const existing = "## Tools\n- Check Inventory\n\n## Guardrails\n- Be nice";
		expect(addToolToInstructions(existing, "Update Store Hours")).toBe(
			"## Tools\n- Check Inventory\n- Update Store Hours\n\n## Guardrails\n- Be nice",
		);
	});

	it("is a no-op when the tool is already referenced elsewhere in the instructions", () => {
		const existing =
			"## Tools Integration\n- Utilize the ai_search_tavily tool effectively to supplement knowledge and ensure up-to-date information.";
		expect(addToolToInstructions(existing, "ai_search_tavily")).toBe(existing);
	});

	it("is a no-op when the tool is referenced in prose without a Tools section", () => {
		const existing =
			"You are a research assistant. Use the ai_search_tavily tool when you need fresh information.";
		expect(addToolToInstructions(existing, "ai_search_tavily")).toBe(existing);
	});

	it("does not match partial/substring tool names", () => {
		const existing = "You rely on the tavily_pro tool for pro searches.";
		expect(addToolToInstructions(existing, "tavily")).toBe(
			`${existing}\n\n## Tools\n- tavily`,
		);
	});
});

describe("removeToolFromInstructions", () => {
	it("removes a matching bullet", () => {
		const existing = "## Tools\n- Check Inventory\n- Update Store Hours";
		expect(removeToolFromInstructions(existing, "Check Inventory")).toBe(
			"## Tools\n- Update Store Hours",
		);
	});

	it("drops the header when the last bullet is removed", () => {
		const existing = "Header text.\n\n## Tools\n- Check Inventory";
		expect(removeToolFromInstructions(existing, "Check Inventory")).toBe(
			"Header text.",
		);
	});

	it("drops the header when the whole instructions were just the section", () => {
		expect(
			removeToolFromInstructions(
				"## Tools\n- Check Inventory",
				"Check Inventory",
			),
		).toBe("");
	});

	it("leaves trailing content intact when the section is dropped", () => {
		const existing = "## Tools\n- Check Inventory\n\n## Guardrails\n- Be nice";
		expect(removeToolFromInstructions(existing, "Check Inventory")).toBe(
			"## Guardrails\n- Be nice",
		);
	});

	it("is a no-op when the section is absent", () => {
		expect(removeToolFromInstructions("Header only.", "Check Inventory")).toBe(
			"Header only.",
		);
	});

	it("is a no-op when the tool isn't in the section", () => {
		const existing = "## Tools\n- Check Inventory";
		expect(removeToolFromInstructions(existing, "Update Store Hours")).toBe(
			existing,
		);
	});
});

describe("removeToolFromInstructions — bold-label inline format", () => {
	it("drops the entire line when the last inline tool is removed", () => {
		const existing = "**Tools:** ai_search_tavily";
		expect(removeToolFromInstructions(existing, "ai_search_tavily")).toBe("");
	});

	it("removes one item from an inline comma-separated list", () => {
		const existing =
			"**Tools:** check_inventory, update_hours, ai_search_tavily";
		expect(removeToolFromInstructions(existing, "update_hours")).toBe(
			"**Tools:** check_inventory, ai_search_tavily",
		);
	});

	it("preserves surrounding task-block lines when stripping inline tool", () => {
		const existing = [
			"## Task: Helper",
			"**Expected Output:** answer",
			"",
			"**Tools:** ai_search_tavily, send_email",
		].join("\n");
		expect(removeToolFromInstructions(existing, "ai_search_tavily")).toBe(
			[
				"## Task: Helper",
				"**Expected Output:** answer",
				"",
				"**Tools:** send_email",
			].join("\n"),
		);
	});

	it("removes the tool from every **Tools:** line across multiple task blocks, dropping lines that become empty", () => {
		const existing = [
			"## Task: One",
			"**Tools:** ai_search_tavily, other",
			"",
			"---",
			"",
			"## Task: Two",
			"**Tools:** ai_search_tavily",
		].join("\n");
		expect(removeToolFromInstructions(existing, "ai_search_tavily")).toBe(
			["## Task: One", "**Tools:** other", "", "---", "", "## Task: Two"].join(
				"\n",
			),
		);
	});

	it("matches on whole tool name only (no substring match)", () => {
		const existing = "**Tools:** tavily_pro";
		expect(removeToolFromInstructions(existing, "tavily")).toBe(existing);
	});

	it("is a no-op when the inline list does not contain the tool", () => {
		const existing = "**Tools:** check_inventory";
		expect(removeToolFromInstructions(existing, "other_tool")).toBe(existing);
	});

	it("accepts the `**Tools**:` variant (colon outside the bold)", () => {
		const existing = "**Tools**: ai_search_tavily, send_email";
		expect(removeToolFromInstructions(existing, "ai_search_tavily")).toBe(
			"**Tools**: send_email",
		);
	});

	it("does not match a bare **Tools** label without a colon", () => {
		const existing = "**Tools** ai_search_tavily";
		expect(removeToolFromInstructions(existing, "ai_search_tavily")).toBe(
			existing,
		);
	});
});

describe("syncAddedToolsInInstructions", () => {
	it("leaves empty instructions untouched when a tool is added", () => {
		expect(syncAddedToolsInInstructions("", ["Check Inventory"])).toBe("");
	});

	it("leaves empty instructions untouched regardless of how many tools are added", () => {
		expect(
			syncAddedToolsInInstructions("", [
				"Check Inventory",
				"Update Store Hours",
			]),
		).toBe("");
	});

	it("returns empty string when both instructions and added tools are empty", () => {
		expect(syncAddedToolsInInstructions("", [])).toBe("");
	});

	it("appends the Tools section below user-written instructions", () => {
		const existing = "You are a helpful assistant.";
		expect(syncAddedToolsInInstructions(existing, ["Check Inventory"])).toBe(
			"You are a helpful assistant.\n\n## Tools\n- Check Inventory",
		);
	});

	it("appends a new bullet to an existing Tools section", () => {
		const existing = "## Tools\n- Check Inventory";
		expect(syncAddedToolsInInstructions(existing, ["Update Store Hours"])).toBe(
			"## Tools\n- Check Inventory\n- Update Store Hours",
		);
	});

	it("appends multiple bullets in order to user-written instructions", () => {
		const existing = "You are helpful.";
		expect(
			syncAddedToolsInInstructions(existing, [
				"Check Inventory",
				"Update Store Hours",
			]),
		).toBe(
			"You are helpful.\n\n## Tools\n- Check Inventory\n- Update Store Hours",
		);
	});
});

describe("syncRemovedToolInInstructions", () => {
	it("leaves empty instructions untouched", () => {
		expect(syncRemovedToolInInstructions("", "Check Inventory")).toBe("");
	});

	it("strips the bullet from a non-empty instructions body", () => {
		const existing =
			"You are helpful.\n\n## Tools\n- Check Inventory\n- Update Store Hours";
		expect(syncRemovedToolInInstructions(existing, "Check Inventory")).toBe(
			"You are helpful.\n\n## Tools\n- Update Store Hours",
		);
	});

	it("drops the Tools section when the last bullet is removed", () => {
		const existing = "You are helpful.\n\n## Tools\n- Check Inventory";
		expect(syncRemovedToolInInstructions(existing, "Check Inventory")).toBe(
			"You are helpful.",
		);
	});

	it("is a no-op when the tool bullet isn't present in non-empty instructions", () => {
		const existing = "You are helpful.";
		expect(syncRemovedToolInInstructions(existing, "Check Inventory")).toBe(
			existing,
		);
	});
});
