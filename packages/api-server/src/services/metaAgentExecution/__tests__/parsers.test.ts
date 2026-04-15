import { describe, expect, it } from "vitest";
import {
	parseConversationStarterContent,
	parseInstructionsImproverContent,
	parseRawJsonResponse,
} from "../parsers.js";

describe("parseInstructionsImproverContent", () => {
	it("extracts instructions and description from valid delimited content", () => {
		const content = `---INSTRUCTIONS---
## Role
You are a helpful assistant.

## Core Responsibilities
- Answer questions
- Provide information
---END_INSTRUCTIONS---

---DESCRIPTION---
A helpful assistant that answers questions.
---END_DESCRIPTION---`;

		const result = parseInstructionsImproverContent(content);

		expect(result.instructions).toBe(
			"## Role\nYou are a helpful assistant.\n\n## Core Responsibilities\n- Answer questions\n- Provide information",
		);
		expect(result.description).toBe(
			"A helpful assistant that answers questions.",
		);
	});

	it("handles extra whitespace around delimiters", () => {
		const content = `  ---INSTRUCTIONS---
  Some instructions
  ---END_INSTRUCTIONS---

  ---DESCRIPTION---
  Some description
  ---END_DESCRIPTION---  `;

		const result = parseInstructionsImproverContent(content);
		expect(result.instructions).toBe("Some instructions");
		expect(result.description).toBe("Some description");
	});

	it("throws when INSTRUCTIONS delimiters are missing", () => {
		const content = `---DESCRIPTION---
Some description
---END_DESCRIPTION---`;

		expect(() => parseInstructionsImproverContent(content)).toThrow(
			"Missing ---INSTRUCTIONS--- delimiters",
		);
	});

	it("throws when DESCRIPTION delimiters are missing", () => {
		const content = `---INSTRUCTIONS---
Some instructions
---END_INSTRUCTIONS---`;

		expect(() => parseInstructionsImproverContent(content)).toThrow(
			"Missing ---DESCRIPTION--- delimiters",
		);
	});

	it("throws on empty content", () => {
		expect(() => parseInstructionsImproverContent("")).toThrow(
			"Missing ---INSTRUCTIONS--- delimiters",
		);
	});

	it("handles multiline markdown with code blocks in instructions", () => {
		const content = `---INSTRUCTIONS---
## Role
You are a code assistant.

\`\`\`typescript
const x = 1;
\`\`\`
---END_INSTRUCTIONS---

---DESCRIPTION---
A code assistant.
---END_DESCRIPTION---`;

		const result = parseInstructionsImproverContent(content);
		expect(result.instructions).toContain("```typescript");
		expect(result.instructions).toContain("const x = 1;");
	});
});

describe("parseConversationStarterContent", () => {
	it("splits comma-separated starters", () => {
		const content =
			"What country is Paris the capital of?, Is New York a capital city?, Tell me about the capital of Japan";

		const result = parseConversationStarterContent(content);
		expect(result).toEqual([
			"What country is Paris the capital of?",
			"Is New York a capital city?",
			"Tell me about the capital of Japan",
		]);
	});

	it("handles single starter", () => {
		const result = parseConversationStarterContent("Hello world");
		expect(result).toEqual(["Hello world"]);
	});

	it("filters empty strings", () => {
		const result = parseConversationStarterContent("Hello, , World");
		expect(result).toEqual(["Hello", "World"]);
	});

	it("handles empty content", () => {
		const result = parseConversationStarterContent("");
		expect(result).toEqual([]);
	});
});

describe("parseRawJsonResponse", () => {
	it("parses clean JSON string", () => {
		const raw = '{"success": true, "content": "hello"}';
		const result = parseRawJsonResponse(raw);
		expect(result.success).toBe(true);
		expect(result.content).toBe("hello");
	});

	it("parses markdown-fenced JSON", () => {
		const raw = '```json\n{"success": true, "content": "fenced"}\n```';
		const result = parseRawJsonResponse(raw);
		expect(result.success).toBe(true);
		expect(result.content).toBe("fenced");
	});

	it("extracts JSON from reasoning text + fenced block", () => {
		const raw = [
			"I need to analyze this agent's configuration carefully.",
			"",
			"**Step 1:** Extract capabilities",
			"- Name: Test Agent",
			"",
			"```json",
			'{"role": "assistant", "content": "Hello, How are you?", "success": true}',
			"```",
		].join("\n");

		const result = parseRawJsonResponse(raw);
		expect(result.success).toBe(true);
		expect(result.content).toBe("Hello, How are you?");
	});

	it("extracts bare JSON object from free text", () => {
		const raw =
			'Some reasoning text\n{"success": true, "content": "bare json"}';
		const result = parseRawJsonResponse(raw);
		expect(result.content).toBe("bare json");
	});

	it("throws on empty string", () => {
		expect(() => parseRawJsonResponse("")).toThrow(
			"No JSON object found in raw response",
		);
	});

	it("throws on text with no JSON", () => {
		expect(() =>
			parseRawJsonResponse("Just some plain text without any JSON"),
		).toThrow("No JSON object found in raw response");
	});

	it("handles multiline JSON inside fence", () => {
		const raw = [
			"Reasoning...",
			"```json",
			"{",
			'  "role": "assistant",',
			'  "content": "Starter 1, Starter 2",',
			'  "need_inputs": [],',
			'  "success": true',
			"}",
			"```",
		].join("\n");

		const result = parseRawJsonResponse(raw);
		expect(result.success).toBe(true);
		expect(result.need_inputs).toEqual([]);
	});

	it("prefers fenced JSON over bare JSON in text", () => {
		const raw = [
			'Some text with a stray { brace and "key": "value" }',
			"```json",
			'{"success": true, "content": "correct"}',
			"```",
		].join("\n");

		const result = parseRawJsonResponse(raw);
		expect(result.content).toBe("correct");
	});
});
