/**
 * Patch the AgentToCreateAgentRita meta-agent in the LLM Service.
 *
 * Injects explicit rules so the meta-agent:
 *  1. preserves the user-provided name verbatim (no snake_case normalization)
 *  2. creates new agents with active:false (draft)
 *
 * Run:
 *   pnpm --filter rita-api-server tsx scripts/fix-agent-builder-prompt.ts [--dry-run]
 *
 * Requires env: LLM_SERVICE_URL, LLM_SERVICE_API_KEY, LLM_SERVICE_DB_TENANT.
 *
 * Idempotent — re-running is a no-op if the rules block is already present.
 */

import { AgenticService } from "../src/services/AgenticService.js";

const AGENT_NAME = "AgentToCreateAgentRita";
const RULES_MARKER = "===== MANDATORY CREATION RULES =====";

const RULES_BLOCK = `${RULES_MARKER}
When creating the new agent, you MUST follow these rules without exception:

1. NAME PRESERVATION — Use the agent name EXACTLY as provided by the user. Preserve the original casing, spacing, and punctuation verbatim. Do NOT lowercase the name. Do NOT convert spaces to underscores. Do NOT apply snake_case, camelCase, PascalCase, or any other transformation.
   - Input: "Support Triage"      → Output name: "Support Triage"  (CORRECT)
   - Input: "Support Triage"      → Output name: "support_triage"  (WRONG)
   - Input: "Incident Bot v2"     → Output name: "Incident Bot v2" (CORRECT)
   - Input: "Incident Bot v2"     → Output name: "incident_bot_v2" (WRONG)

2. DRAFT STATUS — Create every agent with \`active: false\`. Never set \`active: true\` at creation time. The user (or an admin) will publish the agent explicitly later.
=====
`;

/**
 * Inject the rules block into the markdown at the best anchor we can find.
 * Tries anchors in priority order; falls back to prepending.
 */
function patchMarkdown(markdown: string): string {
	// Priority 1: before the execution-parameters section delimiter
	const anchors = [
		/^={3,}\s*Utterance\s*={3,}$/m,
		/^={3,}\s*utterance\s*={3,}$/m,
		/\{%\s*utterance\s*%?\}/, // template param
	];

	for (const re of anchors) {
		const match = markdown.match(re);
		if (match && match.index !== undefined) {
			// Insert a blank line before and after for readability
			return `${markdown.slice(0, match.index)}\n${RULES_BLOCK}\n${markdown.slice(match.index)}`;
		}
	}

	// Fallback: prepend
	return `${RULES_BLOCK}\n${markdown}`;
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");

	if (!process.env.LLM_SERVICE_API_KEY || !process.env.LLM_SERVICE_DB_TENANT) {
		console.error(
			"Missing env: LLM_SERVICE_API_KEY and LLM_SERVICE_DB_TENANT are required.",
		);
		process.exit(1);
	}

	const agenticService = new AgenticService();

	console.log(`Fetching ${AGENT_NAME}...`);
	const current = await agenticService.getAgentByName(AGENT_NAME);

	if (!current) {
		console.error(`Agent "${AGENT_NAME}" not found in LLM Service.`);
		process.exit(1);
	}

	if (!current.eid) {
		console.error(`Agent "${AGENT_NAME}" has no eid — cannot update.`);
		process.exit(1);
	}

	const currentMarkdown = current.markdown_text ?? "";

	console.log(
		`\n--- Current markdown_text (${currentMarkdown.length} chars) ---`,
	);
	console.log(currentMarkdown);
	console.log("--- end ---\n");

	if (currentMarkdown.includes(RULES_MARKER)) {
		console.log(
			`✓ Rules block already present ("${RULES_MARKER}"). Nothing to do.`,
		);
		process.exit(0);
	}

	const patched = patchMarkdown(currentMarkdown);

	console.log(`--- Patched markdown_text (${patched.length} chars) ---`);
	console.log(patched);
	console.log("--- end ---\n");

	if (dryRun) {
		console.log("Dry run — no changes sent to LLM Service.");
		process.exit(0);
	}

	console.log(`PUT /agents/metadata/eid/${current.eid} ...`);
	await agenticService.updateAgent(current.eid, { markdown_text: patched });

	// Verify
	const updated = await agenticService.getAgent(current.eid);
	if (!updated.markdown_text?.includes(RULES_MARKER)) {
		console.error("Verification failed — rules marker not present after PUT.");
		process.exit(1);
	}

	console.log(`✓ Updated ${AGENT_NAME} (eid=${current.eid}).`);
	process.exit(0);
}

main().catch((err) => {
	console.error("Script failed:", err);
	process.exit(1);
});
