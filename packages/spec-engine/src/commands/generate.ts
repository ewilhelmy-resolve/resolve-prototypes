import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { generateApiReference } from "../generators/api-reference.js";
import { generateAvcjDocs } from "../generators/avcj-docs.js";
import { generateDashboard } from "../generators/dashboard.js";
import { generateGlossary } from "../generators/glossary.js";
import { generateInventory } from "../generators/inventory.js";
import { generateMatrix } from "../generators/matrix.js";
import { type Lexicon, LexiconSchema } from "../types/lexicon.js";
import { findRepoRoot } from "../utils/repo-root.js";

interface GenerateOptions {
	output: string;
}

const ARTIFACTS = [
	"glossary",
	"matrix",
	"dashboard",
	"inventory",
	"api-reference",
] as const;
type Artifact = (typeof ARTIFACTS)[number];

export async function generateCommand(
	artifact: string,
	options: GenerateOptions,
) {
	const rootDir = findRepoRoot();
	const outputDir = path.resolve(rootDir, options.output);
	const lexiconPath = path.join(outputDir, "lexicon.json");

	if (!existsSync(lexiconPath)) {
		console.error(chalk.red(`No lexicon.json found at ${lexiconPath}`));
		console.error(chalk.yellow("Run 'spec-engine extract' first."));
		process.exit(1);
	}

	const raw = JSON.parse(readFileSync(lexiconPath, "utf-8"));
	const lexicon = LexiconSchema.parse(raw);

	if (artifact === "all") {
		console.log(chalk.blue("\nGenerating all artifacts...\n"));
		await generateAvcjDocs(lexicon, outputDir);
		for (const a of ARTIFACTS) {
			await runGenerator(a, lexicon, outputDir);
		}
	} else if (ARTIFACTS.includes(artifact as Artifact)) {
		await runGenerator(artifact as Artifact, lexicon, outputDir);
	} else {
		console.error(chalk.red(`Unknown artifact: ${artifact}`));
		console.error(`Available: ${ARTIFACTS.join(", ")}, all`);
		process.exit(1);
	}
}

async function runGenerator(
	artifact: Artifact,
	lexicon: Lexicon,
	outputDir: string,
) {
	const generatedDir = path.join(outputDir, "generated");

	switch (artifact) {
		case "glossary":
			await generateGlossary(lexicon, generatedDir);
			break;
		case "matrix":
			await generateMatrix(lexicon, generatedDir);
			break;
		case "dashboard":
			await generateDashboard(lexicon, generatedDir);
			break;
		case "inventory":
			await generateInventory(lexicon, generatedDir);
			break;
		case "api-reference":
			await generateApiReference(lexicon, generatedDir);
			break;
	}

	console.log(chalk.green(`  Generated: ${artifact}`));
}
