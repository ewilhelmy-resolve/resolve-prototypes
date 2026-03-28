import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Lexicon } from "../types/lexicon.js";

export async function generateInventory(lexicon: Lexicon, outputDir: string) {
	mkdirSync(outputDir, { recursive: true });

	let md = "# Code Inventory\n\n";
	md += "> Full codebase listing by category\n\n";

	// Actors by kind
	const actorKinds = groupBy(lexicon.actors, (a) => a.kind);
	md += "## Actors\n\n";
	for (const [kind, items] of Object.entries(actorKinds)) {
		md += `### ${capitalize(kind)}s (${items.length})\n\n`;
		md += "| Name | Source | Description |\n|------|--------|-------------|\n";
		for (const item of items) {
			md += `| [${item.name}](../actors/${item.id}.md) | \`${item.sources[0]?.file || ""}\` | ${item.description.split("\n")[0] || "—"} |\n`;
		}
		md += "\n";
	}

	// Views by kind
	const viewKinds = groupBy(lexicon.views, (v) => v.kind);
	md += "## Views\n\n";
	for (const [kind, items] of Object.entries(viewKinds)) {
		md += `### ${capitalize(kind)}s (${items.length})\n\n`;
		md +=
			"| Name | Route | Storybook | Source |\n|------|-------|-----------|--------|\n";
		for (const item of items) {
			md += `| [${item.name}](../views/${item.id}.md) | ${item.route ? `\`${item.route}\`` : "—"} | ${item.storybookPath || "—"} | \`${item.sources[0]?.file || ""}\` |\n`;
		}
		md += "\n";
	}

	// Constraints by kind
	const constraintKinds = groupBy(lexicon.constraints, (c) => c.kind);
	md += "## Constraints\n\n";
	for (const [kind, items] of Object.entries(constraintKinds)) {
		md += `### ${capitalize(kind)}s (${items.length})\n\n`;
		md += "| Name | Enforcement | Source |\n|------|-------------|--------|\n";
		for (const item of items) {
			md += `| [${item.name}](../constraints/${item.id}.md) | ${item.enforcement} | \`${item.sources[0]?.file || ""}\` |\n`;
		}
		md += "\n";
	}

	// Journeys
	md += "## Journeys\n\n";
	md +=
		"| Name | Steps | Actors | Views | Constraints |\n|------|-------|--------|-------|-------------|\n";
	for (const j of lexicon.journeys) {
		md += `| [${j.name}](../journeys/${j.id}.md) | ${j.steps.length} | ${j.actors.length} | ${j.views.length} | ${j.constraints.length} |\n`;
	}

	writeFileSync(path.join(outputDir, "inventory.md"), md);
}

function groupBy<T>(
	items: T[],
	keyFn: (item: T) => string,
): Record<string, T[]> {
	const groups: Record<string, T[]> = {};
	for (const item of items) {
		const key = keyFn(item);
		if (!groups[key]) groups[key] = [];
		groups[key].push(item);
	}
	return groups;
}

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
