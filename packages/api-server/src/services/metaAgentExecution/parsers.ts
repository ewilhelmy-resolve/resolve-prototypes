/**
 * Meta-Agent Content Parsers
 *
 * Each meta-agent returns a `content` string in a different format.
 * These parsers extract structured data from the raw content field.
 *
 * See docs/features/agents/agent-prompt-catalog.md for format specs.
 */

// ============================================================================
// Shared envelope unwrapping
// ============================================================================

/**
 * If the raw LLM output is wrapped in the legacy "Standard Response Format"
 * envelope (`{ role, content, success, ... }`), unwrap it to just the inner
 * `content` value. Otherwise return the original string.
 *
 * This is needed because prompt rulesets inherit the envelope framing from
 * the legacy agent tasks (see RG-828). The agent framework used to strip the
 * envelope automatically; raw `/prompts/completion` does not.
 */
function unwrapEnvelope(raw: string): string | string[] {
	try {
		const parsed = parseRawJsonResponse(raw);
		const content = parsed?.content;
		if (typeof content === "string") return content;
		if (Array.isArray(content)) return content as string[];
	} catch {
		// not JSON — fall through
	}
	return raw;
}

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
	const unwrapped = unwrapEnvelope(content);
	const effective = Array.isArray(unwrapped) ? unwrapped.join("\n") : unwrapped;

	const instructionsMatch = effective.match(
		/---INSTRUCTIONS---\s*([\s\S]*?)\s*---END_INSTRUCTIONS---/,
	);
	// LLM occasionally omits the closing ---END_DESCRIPTION--- when the
	// description is the final section; fall back to end-of-string.
	const descriptionMatch =
		effective.match(/---DESCRIPTION---\s*([\s\S]*?)\s*---END_DESCRIPTION---/) ??
		effective.match(/---DESCRIPTION---\s*([\s\S]+?)\s*$/);

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

/** Fragments that indicate JSON syntax leaked through as a "starter". */
const JSON_RESIDUE_RE =
	/^[{}[\]]|[{}[\]]$|"(role|content|need_inputs|terminate|success|error_message)"\s*:/;

/**
 * Parse the comma-separated content from ConversationStarterGenerator.
 *
 * Expected format: "Starter 1, Starter 2, Starter 3, Starter 4"
 *
 * Also handles the legacy "Standard Response Format" envelope — if the LLM
 * returns `{ "content": "Starter 1, Starter 2, ...", ... }` or
 * `{ "content": ["Starter 1", "Starter 2", ...], ... }`, unwrap to the inner
 * payload before splitting.
 */
export function parseConversationStarterContent(content: string): string[] {
	const unwrapped = unwrapEnvelope(content);

	const raw: string[] = Array.isArray(unwrapped)
		? unwrapped
		: unwrapped.split(", ");

	return raw
		.map((s) => s.trim())
		.filter(Boolean)
		.filter((s) => !JSON_RESIDUE_RE.test(s));
}
