import path from "node:path";
import chalk from "chalk";
import { findRepoRoot } from "../utils/repo-root.js";
import { extractCommand } from "./extract.js";
import { generateCommand } from "./generate.js";

interface BuildOptions {
	output: string;
}

export async function buildCommand(options: BuildOptions) {
	const rootDir = findRepoRoot();
	const _outputDir = path.resolve(rootDir, options.output);

	console.log(chalk.bold("spec-engine build — full pipeline\n"));

	// Step 1: Extract
	await extractCommand({
		output: path.join(options.output, "lexicon.json"),
	});

	// Step 2: Generate all artifacts
	await generateCommand("all", { output: options.output });

	console.log(chalk.bold.green("\nBuild complete."));
}
