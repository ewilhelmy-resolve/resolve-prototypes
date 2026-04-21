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

/**
 * Lines like `**Tools:** a, b, c` or `**Tools**: a, b` are emitted by the
 * server's task-block serializer and commonly show up in LLM-generated
 * instructions. Strip `toolName` from any such comma-list. Drop the whole
 * line when the last item is removed so stale empty `**Tools:**` labels
 * don't linger in the textarea. Lines without an inline value are left
 * for the heading pass below.
 */
const INLINE_TOOLS_LABEL_REGEX = /^(\s*\*\*Tools(?::\*\*|\*\*:))\s*(.*)$/;

function removeToolFromInlineToolsLines(
	instructions: string,
	toolName: string,
): string {
	const out: string[] = [];
	for (const line of instructions.split("\n")) {
		const match = line.match(INLINE_TOOLS_LABEL_REGEX);
		if (!match) {
			out.push(line);
			continue;
		}
		const label = match[1] ?? "";
		const rest = (match[2] ?? "").trim();
		if (rest.length === 0) {
			out.push(line);
			continue;
		}
		const items = rest
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (!items.includes(toolName)) {
			out.push(line);
			continue;
		}
		const remaining = items.filter((t) => t !== toolName);
		if (remaining.length === 0) continue;
		out.push(`${label} ${remaining.join(", ")}`);
	}
	return out.join("\n");
}

export function removeToolFromInstructions(
	instructions: string,
	toolName: string,
): string {
	if (toolName.length === 0) return instructions;
	const afterInline = removeToolFromInlineToolsLines(instructions, toolName);
	const bullet = buildBullet(toolName);
	const lines = afterInline.split("\n");
	const section = findToolsSection(lines);
	if (!section) return afterInline;

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

/**
 * Guard for the creation-form UX: only append the `## Tools` section when the
 * user has already written something in `instructions`. Leaving an empty field
 * untouched avoids auto-generated content appearing on a fresh create form.
 */
export function syncAddedToolsInInstructions(
	currentInstructions: string,
	addedToolNames: string[],
): string {
	if (currentInstructions === "") return currentInstructions;
	let next = currentInstructions;
	for (const name of addedToolNames) {
		next = addToolToInstructions(next, name);
	}
	return next;
}

/**
 * Symmetric guard for removal: strip the bullet from an already-populated
 * instructions field. Empty instructions stay empty.
 */
export function syncRemovedToolInInstructions(
	currentInstructions: string,
	removedToolName: string,
): string {
	if (currentInstructions === "") return currentInstructions;
	return removeToolFromInstructions(currentInstructions, removedToolName);
}
