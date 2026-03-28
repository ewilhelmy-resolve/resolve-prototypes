import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { glob } from "glob";
import type { Vocabulary } from "../types/vocabulary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CheckResult {
	errors: number;
	warnings: number;
}

export async function checkVocabulary(
	rootDir: string,
	discoverDir: string,
): Promise<CheckResult> {
	const fullDir = path.join(rootDir, discoverDir);
	const termsPath = path.resolve(__dirname, "../../data/terms.json");
	let warnings = 0;

	if (!existsSync(fullDir)) {
		console.log(
			chalk.yellow(
				"  No docs/discover/ directory found — skipping vocabulary check.",
			),
		);
		return { errors: 0, warnings: 0 };
	}

	if (!existsSync(termsPath)) {
		console.log(
			chalk.yellow("  No terms.json found — skipping vocabulary check."),
		);
		return { errors: 0, warnings: 0 };
	}

	const vocabulary: Vocabulary = JSON.parse(readFileSync(termsPath, "utf-8"));
	const aliasMap = new Map<string, string>();

	for (const [canonical, term] of Object.entries(vocabulary.terms)) {
		for (const alias of term.aliases) {
			aliasMap.set(alias.toLowerCase(), canonical);
		}
	}

	const mdFiles = await glob("**/*.md", { cwd: fullDir });

	for (const file of mdFiles) {
		if (file.startsWith("generated/")) continue;

		const content = readFileSync(path.join(fullDir, file), "utf-8");
		const words = content.toLowerCase().split(/\s+/);

		for (const word of words) {
			const clean = word.replace(/[^a-z-]/g, "");
			const canonical = aliasMap.get(clean);
			if (canonical) {
				warnings++;
				if (warnings <= 10) {
					console.log(
						chalk.yellow(`  ${file}: "${clean}" → prefer "${canonical}"`),
					);
				}
			}
		}
	}

	if (warnings > 10) {
		console.log(
			chalk.yellow(`  ...and ${warnings - 10} more vocabulary suggestions.`),
		);
	}

	if (warnings === 0) {
		console.log(chalk.green("  Vocabulary: consistent"));
	}

	// Vocabulary suggestions are warnings, not blocking errors
	return { errors: 0, warnings };
}
