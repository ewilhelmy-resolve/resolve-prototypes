import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Lexicon } from "../types/lexicon.js";

export async function generateGlossary(lexicon: Lexicon, outputDir: string) {
	mkdirSync(outputDir, { recursive: true });

	const entries: {
		name: string;
		type: string;
		description: string;
		link: string;
	}[] = [];

	for (const a of lexicon.actors) {
		entries.push({
			name: a.name,
			type: "Actor",
			description: a.description.split("\n")[0],
			link: `../actors/${a.id}.md`,
		});
	}
	for (const v of lexicon.views) {
		entries.push({
			name: v.name,
			type: "View",
			description: v.description.split("\n")[0],
			link: `../views/${v.id}.md`,
		});
	}
	for (const j of lexicon.journeys) {
		entries.push({
			name: j.name,
			type: "Journey",
			description: j.description.split("\n")[0],
			link: `../journeys/${j.id}.md`,
		});
	}
	for (const c of lexicon.constraints) {
		entries.push({
			name: c.name,
			type: "Constraint",
			description: c.description.split("\n")[0],
			link: `../constraints/${c.id}.md`,
		});
	}

	entries.sort((a, b) => a.name.localeCompare(b.name));

	let md = "# Glossary\n\n";
	md += `> ${entries.length} terms — auto-generated\n\n`;

	// Vocabulary terms
	if (lexicon.vocabulary?.terms) {
		md += "## Vocabulary\n\n";
		md += "| Term | Aliases | Definition |\n|------|---------|------------|\n";
		for (const [term, info] of Object.entries(lexicon.vocabulary.terms)) {
			md += `| **${term}** | ${info.aliases.join(", ") || "—"} | ${info.definition} |\n`;
		}
		md += "\n";
	}

	// All AVCJ entries
	md += "## All Entries\n\n";
	md += "| Name | Type | Description |\n|------|------|-------------|\n";
	for (const e of entries) {
		md += `| [${e.name}](${e.link}) | ${e.type} | ${e.description || "—"} |\n`;
	}

	writeFileSync(path.join(outputDir, "glossary.md"), md);
}
