import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Lexicon } from "../types/lexicon.js";

export async function generateMatrix(lexicon: Lexicon, outputDir: string) {
	mkdirSync(outputDir, { recursive: true });

	let md = "# Traceability Matrix\n\n";
	md += "> Journey × Actor × View × Constraint cross-reference\n\n";

	if (lexicon.journeys.length === 0) {
		md += "*No journeys extracted yet.*\n";
		writeFileSync(path.join(outputDir, "matrix.md"), md);
		return;
	}

	// Journey → Actors table
	md += "## Journeys → Actors\n\n";
	const actorIds = lexicon.actors.map((a) => a.id);
	md += `| Journey | ${actorIds.map((id) => id).join(" | ")} |\n`;
	md += `| --- | ${actorIds.map(() => "---").join(" | ")} |\n`;
	for (const j of lexicon.journeys) {
		const cells = actorIds.map((id) => (j.actors.includes(id) ? "x" : ""));
		md += `| [${j.name}](../journeys/${j.id}.md) | ${cells.join(" | ")} |\n`;
	}

	md += "\n";

	// Journey → Views table
	md += "## Journeys → Views\n\n";
	const viewIds = lexicon.views
		.filter((v) => v.kind === "page")
		.map((v) => v.id);
	if (viewIds.length > 0) {
		md += `| Journey | ${viewIds.join(" | ")} |\n`;
		md += `| --- | ${viewIds.map(() => "---").join(" | ")} |\n`;
		for (const j of lexicon.journeys) {
			const cells = viewIds.map((id) => (j.views.includes(id) ? "x" : ""));
			md += `| [${j.name}](../journeys/${j.id}.md) | ${cells.join(" | ")} |\n`;
		}
	}

	md += "\n";

	// Journey → Constraints table
	md += "## Journeys → Constraints\n\n";
	const constraintIds = lexicon.constraints.map((c) => c.id);
	if (constraintIds.length > 0) {
		md += `| Journey | ${constraintIds.join(" | ")} |\n`;
		md += `| --- | ${constraintIds.map(() => "---").join(" | ")} |\n`;
		for (const j of lexicon.journeys) {
			const cells = constraintIds.map((id) =>
				j.constraints.includes(id) ? "x" : "",
			);
			md += `| [${j.name}](../journeys/${j.id}.md) | ${cells.join(" | ")} |\n`;
		}
	}

	writeFileSync(path.join(outputDir, "matrix.md"), md);
}
