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
