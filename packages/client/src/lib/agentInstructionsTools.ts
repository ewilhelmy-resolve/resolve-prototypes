/**
 * Pure helpers that keep the agent builder's `instructions` textarea in sync
 * with its selected tools/skills. Toggling a skill in the UI adds/removes a
 * bullet under a `## Tools` section so the user can see the current tool set
 * reflected in the instructions they edit.
 *
 * One-way sync: selector → instructions. Hand edits inside the section are
 * not re-synced back to `config.tools`.
 */

const TOOLS_HEADER = "## Tools";

function buildBullet(toolName: string): string {
	return `- ${toolName}`;
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isToolReferenced(instructions: string, toolName: string): boolean {
	if (toolName.length === 0) return false;
	return new RegExp(`\\b${escapeRegex(toolName)}\\b`).test(instructions);
}

/**
 * Find the `## Tools` header line and the range of bullet lines directly
 * following it. Returns `null` when the section is absent.
 */
function findToolsSection(
	lines: string[],
): { headerIndex: number; bulletStart: number; bulletEnd: number } | null {
	const headerIndex = lines.findIndex((line) => line.trim() === TOOLS_HEADER);
	if (headerIndex === -1) return null;

	let bulletEnd = headerIndex + 1;
	while (bulletEnd < lines.length && /^\s*-\s+/.test(lines[bulletEnd] ?? "")) {
		bulletEnd++;
	}
	return { headerIndex, bulletStart: headerIndex + 1, bulletEnd };
}

export function addToolToInstructions(
	instructions: string,
	toolName: string,
): string {
	if (isToolReferenced(instructions, toolName)) return instructions;

	const bullet = buildBullet(toolName);
	const lines = instructions.split("\n");
	const section = findToolsSection(lines);

	if (!section) {
		const prefix = instructions.length === 0 ? "" : instructions.trimEnd();
		const separator = prefix.length === 0 ? "" : "\n\n";
		return `${prefix}${separator}${TOOLS_HEADER}\n${bullet}`;
	}

	const next = [...lines];
	next.splice(section.bulletEnd, 0, bullet);
	return next.join("\n");
}

export function removeToolFromInstructions(
	instructions: string,
	toolName: string,
): string {
	const bullet = buildBullet(toolName);
	const lines = instructions.split("\n");
	const section = findToolsSection(lines);
	if (!section) return instructions;

	const next = [...lines];
	let removed = false;
	for (let i = section.bulletEnd - 1; i >= section.bulletStart; i--) {
		if (next[i]?.trim() === bullet) {
			next.splice(i, 1);
			removed = true;
			break;
		}
	}
	if (!removed) return instructions;

	const remainingBullets = next
		.slice(section.bulletStart, section.bulletEnd - 1)
		.some((line) => /^\s*-\s+/.test(line));
	if (!remainingBullets) {
		next.splice(section.headerIndex, 1);
		if (
			section.headerIndex > 0 &&
			section.headerIndex < next.length &&
			(next[section.headerIndex - 1] ?? "") === "" &&
			(next[section.headerIndex] ?? "") === ""
		) {
			next.splice(section.headerIndex, 1);
		}
		while (next.length > 0 && (next[0] ?? "") === "") {
			next.shift();
		}
		while (next.length > 0 && (next[next.length - 1] ?? "") === "") {
			next.pop();
		}
	}
	return next.join("\n");
}
