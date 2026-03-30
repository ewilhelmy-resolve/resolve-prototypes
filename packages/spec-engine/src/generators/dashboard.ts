import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Lexicon } from "../types/lexicon.js";

export async function generateDashboard(lexicon: Lexicon, outputDir: string) {
	mkdirSync(outputDir, { recursive: true });

	const { stats } = lexicon;
	const barLength = 30;
	const filled = Math.round((stats.coveragePercent / 100) * barLength);
	const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

	let md = "# Specification Dashboard\n\n";
	md += `> Generated on ${new Date().toISOString().split("T")[0]}\n\n`;

	md += "## Coverage\n\n";
	md += `\`\`\`\n${bar} ${stats.coveragePercent.toFixed(1)}%\n\`\`\`\n\n`;
	md += `| Metric | Value |\n|--------|-------|\n`;
	md += `| Files scanned | ${stats.totalFiles} |\n`;
	md += `| Exports found | ${stats.totalExports} |\n`;
	md += `| With JSDoc | ${stats.annotatedExports} |\n`;
	md += `| Coverage | ${stats.coveragePercent.toFixed(1)}% |\n`;

	md += "\n## AVCJ Summary\n\n";
	md += `| Category | Count |\n|----------|-------|\n`;
	md += `| Actors | ${lexicon.actors.length} |\n`;
	md += `| Views | ${lexicon.views.length} |\n`;
	md += `| Journeys | ${lexicon.journeys.length} |\n`;
	md += `| Constraints | ${lexicon.constraints.length} |\n`;
	md += `| **Total** | **${lexicon.actors.length + lexicon.views.length + lexicon.journeys.length + lexicon.constraints.length}** |\n`;

	// Per-package breakdown
	md += "\n## By Package\n\n";
	const packages = ["api-server", "client", "iframe-app"];
	md +=
		"| Package | Actors | Views | Constraints |\n|---------|--------|-------|-------------|\n";
	for (const pkg of packages) {
		const actors = lexicon.actors.filter(
			(a) => a.sources[0]?.package === pkg,
		).length;
		const views = lexicon.views.filter(
			(v) => v.sources[0]?.package === pkg,
		).length;
		const constraints = lexicon.constraints.filter(
			(c) => c.sources[0]?.package === pkg,
		).length;
		if (actors + views + constraints > 0) {
			md += `| ${pkg} | ${actors} | ${views} | ${constraints} |\n`;
		}
	}

	// Undocumented items
	const undocumented: Array<{
		id: string;
		name: string;
		sources: Array<{ file: string }>;
	}> = [
		...lexicon.actors.filter((a) => !a.description),
		...lexicon.views.filter((v) => !v.description),
		...lexicon.constraints.filter((c) => !c.description),
	];

	if (undocumented.length > 0) {
		md += "\n## Missing Documentation\n\n";
		md += "Items with no JSDoc description:\n\n";
		for (const item of undocumented.slice(0, 20)) {
			md += `- \`${item.name}\` — ${item.sources[0]?.file || "unknown"}\n`;
		}
		if (undocumented.length > 20) {
			md += `\n*...and ${undocumented.length - 20} more.*\n`;
		}
	}

	writeFileSync(path.join(outputDir, "dashboard.md"), md);
}
