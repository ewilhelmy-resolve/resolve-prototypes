import chalk from "chalk";
import { checkLinks } from "../utils/link-checker.js";
import { checkTemplates } from "../utils/template-validator.js";
import { checkVocabulary } from "../utils/vocabulary-checker.js";

export async function checkCommand(scope?: string) {
	const target = scope || "all";
	const rootDir = process.cwd();
	const discoverDir = "docs/discover";

	console.log(chalk.blue(`spec-engine check ${target}\n`));

	let errors = 0;

	if (target === "all" || target === "links") {
		const result = await checkLinks(rootDir, discoverDir);
		errors += result.errors;
	}

	if (target === "all" || target === "templates") {
		const result = await checkTemplates(rootDir, discoverDir);
		errors += result.errors;
	}

	if (target === "all" || target === "vocabulary") {
		const result = await checkVocabulary(rootDir, discoverDir);
		errors += result.errors;
	}

	if (errors > 0) {
		console.log(chalk.red(`\n${errors} error(s) found.`));
		process.exit(1);
	}

	console.log(chalk.green("\nAll checks passed."));
}
