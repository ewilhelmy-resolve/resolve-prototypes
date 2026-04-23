import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { glob } from "glob";
import matter from "gray-matter";

export interface CheckResult {
	errors: number;
	warnings: number;
}

const REQUIRED_FIELDS: Record<string, string[]> = {
	actor: ["type", "id", "name", "kind", "package"],
	view: ["type", "id", "name", "kind"],
	journey: ["type", "id", "name"],
	constraint: ["type", "id", "name", "kind", "enforcement"],
};

export async function checkTemplates(
	rootDir: string,
	discoverDir: string,
): Promise<CheckResult> {
	const fullDir = path.join(rootDir, discoverDir);
	if (!existsSync(fullDir)) {
		console.log(
			chalk.yellow(
				"  No docs/discover/ directory found — skipping template check.",
			),
		);
		return { errors: 0, warnings: 0 };
	}

	const mdFiles = await glob("{actors,views,journeys,constraints}/*.md", {
		cwd: fullDir,
	});
	let errors = 0;

	for (const file of mdFiles) {
		const content = readFileSync(path.join(fullDir, file), "utf-8");

		try {
			const { data } = matter(content);
			const type = data.type as string;

			if (!type || !REQUIRED_FIELDS[type]) {
				console.log(
					chalk.red(`  ${file}: missing or invalid 'type' in frontmatter`),
				);
				errors++;
				continue;
			}

			for (const field of REQUIRED_FIELDS[type]) {
				if (!data[field]) {
					console.log(
						chalk.red(`  ${file}: missing required field '${field}'`),
					);
					errors++;
				}
			}
		} catch (_e) {
			console.log(chalk.red(`  ${file}: invalid frontmatter`));
			errors++;
		}
	}

	if (errors === 0) {
		console.log(chalk.green("  Templates: all conformant"));
	}

	return { errors, warnings: 0 };
}
