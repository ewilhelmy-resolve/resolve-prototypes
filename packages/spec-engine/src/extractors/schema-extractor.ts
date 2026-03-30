import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import type { Constraint } from "../types/avcj.js";

export interface SchemaData {
	constraints: Constraint[];
}

export async function extractSchemas(rootDir: string): Promise<SchemaData> {
	const constraints: Constraint[] = [];
	const schemaFiles = await glob("packages/api-server/src/schemas/*.ts", {
		cwd: rootDir,
	});

	for (const file of schemaFiles) {
		const basename = path.basename(file, ".ts");
		if (basename === "index") continue;

		const content = readFileSync(path.join(rootDir, file), "utf-8");

		// Find exported Zod schemas
		const schemaRegex = /export\s+const\s+(\w+Schema)\s*=/g;
		for (const match of content.matchAll(schemaRegex)) {
			const name = match[1];
			const id = toKebabCase(name);

			// Try to find a preceding comment
			const before = content.slice(Math.max(0, match.index - 300), match.index);
			const commentMatch = before.match(/\/\*\*\s*([\s\S]*?)\s*\*\/\s*$/);
			const description = commentMatch
				? commentMatch[1]
						.replace(/^\s*\*\s?/gm, "")
						.trim()
						.split("\n")[0]
				: `Zod validation schema from ${basename}.ts`;

			constraints.push({
				id,
				name,
				kind: "schema",
				description,
				enforcement: "runtime",
				sources: [
					{
						file,
						line: content.slice(0, match.index).split("\n").length,
						package: "api-server",
					},
				],
				tags: [],
			});
		}
	}

	return { constraints };
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.replace(/[_\s]+/g, "-")
		.toLowerCase();
}
