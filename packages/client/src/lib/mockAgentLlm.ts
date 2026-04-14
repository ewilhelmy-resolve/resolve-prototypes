/**
 * Mock LLM helpers for agent builder UX features.
 * Simulates AI-powered instruction improvement and starter generation.
 */

export async function mockImproveInstructions(
	current: string,
	agentName?: string,
): Promise<string> {
	await new Promise((r) => setTimeout(r, 1500));

	const trimmed = current.trim();
	if (!trimmed) {
		return current;
	}

	// If already structured with ## headings, lightly normalize
	if (trimmed.includes("##")) {
		// Ensure each ## heading is followed by content
		const lines = trimmed.split("\n");
		const result: string[] = [];
		for (let i = 0; i < lines.length; i++) {
			result.push(lines[i]);
			// If this is a heading and next line is also a heading or end, add placeholder
			if (lines[i].startsWith("##")) {
				const nextNonEmpty = lines
					.slice(i + 1)
					.find((l) => l.trim().length > 0);
				if (
					!nextNonEmpty ||
					nextNonEmpty.startsWith("##") ||
					i === lines.length - 1
				) {
					result.push("");
				}
			}
		}
		return `${result.join("\n")}\n\n(Already structured — no changes needed.)`;
	}

	// Extract first sentence and rest
	const sentenceEnd = trimmed.search(/[.!?]\s|[.!?]$/);
	const firstSentence =
		sentenceEnd >= 0
			? trimmed.slice(0, sentenceEnd + 1).trim()
			: trimmed.slice(0, 80);
	const rest = sentenceEnd >= 0 ? trimmed.slice(sentenceEnd + 1).trim() : "";

	const name = agentName || "a virtual assistant";
	const purpose = firstSentence || "help users complete their tasks";
	const backstory =
		rest ||
		"You have access to the necessary tools and knowledge to support users effectively. You are professional, empathetic, and concise in your responses.";

	return `## Role
You are ${name} designed to ${purpose.toLowerCase().replace(/^you are\s*/i, "")}

## Backstory
${backstory}

## Goal
The interaction is complete when the user has accomplished their task and confirmed they have what they need.`;
}

const STARTER_MAP: { pattern: RegExp; starters: string[] }[] = [
	{
		pattern: /hr|onboard|pto|benefit/i,
		starters: [
			"What's my PTO balance?",
			"How do I enroll in benefits?",
			"When is my first day?",
			"Show me the employee handbook",
		],
	},
	{
		pattern: /it|password|access|account|vpn/i,
		starters: [
			"Reset my password",
			"Unlock my account",
			"How do I connect to VPN?",
			"Request software access",
		],
	},
	{
		pattern: /finance|expense|invoice|reimburse/i,
		starters: [
			"Submit an expense report",
			"How do I get reimbursed?",
			"What's my budget for this quarter?",
			"Where do I send invoices?",
		],
	},
];

const DEFAULT_STARTERS = [
	"What can you help me with?",
	"Show me your skills",
	"How do I get started?",
	"What information do you need from me?",
];

export async function mockGenerateStarters(ctx: {
	name?: string;
	description?: string;
	instructions?: string;
	existingStarters: string[];
}): Promise<string[]> {
	await new Promise((r) => setTimeout(r, 1500));

	const combined =
		`${ctx.name || ""} ${ctx.description || ""} ${ctx.instructions || ""}`.toLowerCase();
	const existingLower = ctx.existingStarters.map((s) => s.toLowerCase());

	let pool = DEFAULT_STARTERS;
	for (const entry of STARTER_MAP) {
		if (entry.pattern.test(combined)) {
			pool = entry.starters;
			break;
		}
	}

	// De-dupe against existing (case-insensitive)
	const deduped = pool.filter((s) => !existingLower.includes(s.toLowerCase()));

	// Return up to (4 - existingCount)
	const slotsAvailable = Math.max(0, 4 - ctx.existingStarters.length);
	return deduped.slice(0, slotsAvailable);
}
