import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { glob } from "glob";

export interface CheckResult {
	errors: number;
	warnings: number;
}

export async function checkLinks(
	rootDir: string,
	discoverDir: string,
): Promise<CheckResult> {
	const fullDir = path.join(rootDir, discoverDir);
	if (!existsSync(fullDir)) {
		console.log(
			chalk.yellow(
				"  No docs/discover/ directory found — skipping link check.",
			),
		);
		return { errors: 0, warnings: 0 };
	}

	const mdFiles = await glob("**/*.md", { cwd: fullDir });
	let errors = 0;

	for (const file of mdFiles) {
		const content = readFileSync(path.join(fullDir, file), "utf-8");
		const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
		for (const match of content.matchAll(linkRegex)) {
			const target = match[2];
			if (target.startsWith("http") || target.startsWith("#")) continue;

			const resolvedPath = path.resolve(
				path.dirname(path.join(fullDir, file)),
				target,
			);
			if (!existsSync(resolvedPath)) {
				console.log(chalk.red(`  Broken link in ${file}: ${target}`));
				errors++;
			}
		}
	}

	if (errors === 0) {
		console.log(chalk.green("  Links: all valid"));
	}

	return { errors, warnings: 0 };
}
