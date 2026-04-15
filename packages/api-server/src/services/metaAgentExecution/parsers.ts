/**
 * Meta-Agent Content Parsers
 *
 * Each meta-agent returns a `content` string in a different format.
 * These parsers extract structured data from the raw content field.
 *
 * See docs/features/agents/agent-prompt-catalog.md for format specs.
 */

// ============================================================================
// AgentInstructionsImprover
// ============================================================================

export interface ImprovedInstructions {
	instructions: string;
	description: string;
}

/**
 * Parse the delimited content from AgentInstructionsImprover.
 *
 * Expected format:
 * ```
 * ---INSTRUCTIONS---
 * <improved instructions markdown>
 * ---END_INSTRUCTIONS---
 *
 * ---DESCRIPTION---
 * <improved description>
 * ---END_DESCRIPTION---
 * ```
 */
export function parseInstructionsImproverContent(
	content: string,
): ImprovedInstructions {
	const instructionsMatch = content.match(
		/---INSTRUCTIONS---\s*([\s\S]*?)\s*---END_INSTRUCTIONS---/,
	);
	const descriptionMatch = content.match(
		/---DESCRIPTION---\s*([\s\S]*?)\s*---END_DESCRIPTION---/,
	);

	if (!instructionsMatch) {
		throw new Error("Missing ---INSTRUCTIONS--- delimiters in response");
	}
	if (!descriptionMatch) {
		throw new Error("Missing ---DESCRIPTION--- delimiters in response");
	}

	return {
		instructions: instructionsMatch[1].trim(),
		description: descriptionMatch[1].trim(),
	};
}

// ============================================================================
// Generic raw response parser
// ============================================================================

/**
 * Extract a JSON object from a raw LLM response string.
 *
 * Handles multiple formats:
 * - Clean JSON string: `{"success": true, ...}`
 * - Markdown-fenced JSON: ` ```json\n{...}\n``` `
 * - Reasoning text followed by fenced or bare JSON (e.g. Claude Opus chain-of-thought)
 */
export function parseRawJsonResponse(raw: string): Record<string, any> {
	// 1. Try extracting from ```json fence
	const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
	if (fenceMatch) {
		return JSON.parse(fenceMatch[1].trim());
	}

	// 2. Try parsing the whole string as JSON
	const trimmed = raw.trim();
	if (trimmed.startsWith("{")) {
		return JSON.parse(trimmed);
	}

	// 3. Extract the first JSON object from free-text output
	const jsonStart = raw.indexOf("{");
	const jsonEnd = raw.lastIndexOf("}");
	if (jsonStart !== -1 && jsonEnd > jsonStart) {
		return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
	}

	throw new Error("No JSON object found in raw response");
}

// ============================================================================
// ConversationStarterGenerator
// ============================================================================

/**
 * Parse the comma-separated content from ConversationStarterGenerator.
 *
 * Expected format: "Starter 1, Starter 2, Starter 3, Starter 4"
 */
export function parseConversationStarterContent(content: string): string[] {
	return content
		.split(", ")
		.map((s) => s.trim())
		.filter(Boolean);
}
