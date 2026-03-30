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

		const schemaRegex = /export\s+const\s+(\w+Schema)\s*=/g;
		for (const match of content.matchAll(schemaRegex)) {
			const name = match[1];
			const id = toKebabCase(name);

			// Extract JSDoc comment before the schema
			const before = content.slice(Math.max(0, match.index - 300), match.index);
			const commentMatch = before.match(/\/\*\*\s*([\s\S]*?)\s*\*\/\s*$/);
			const jsdocDescription = commentMatch
				? commentMatch[1]
						.replace(/^\s*\*\s?/gm, "")
						.trim()
						.split("\n")[0]
				: "";

			// Extract the schema body to parse Zod rules
			const schemaBody = extractSchemaBody(
				content,
				match.index + match[0].length,
			);
			const rules = parseZodRules(schemaBody);

			// Build description from JSDoc + Zod rules
			const description = buildDescription(jsdocDescription, rules, basename);

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
				tags: rules.length > 0 ? ["zod-validated"] : [],
			});
		}
	}

	return { constraints };
}

interface ZodRule {
	field: string;
	type: string;
	validations: string[];
}

/**
 * Extract the body of a schema definition (everything between the first z. and the matching semicolon/newline).
 */
function extractSchemaBody(content: string, startIndex: number): string {
	let depth = 0;
	let i = startIndex;

	// Skip whitespace
	while (i < content.length && /\s/.test(content[i])) i++;

	const bodyStart = i;
	let foundStart = false;

	while (i < content.length) {
		const ch = content[i];
		if (ch === "(" || ch === "{" || ch === "[") {
			depth++;
			foundStart = true;
		}
		if (ch === ")" || ch === "}" || ch === "]") depth--;

		// End of schema: semicolon at depth 0, or newline with no open parens
		if (foundStart && depth === 0 && (ch === ";" || ch === "\n")) {
			break;
		}

		i++;
		// Safety limit
		if (i - bodyStart > 5000) break;
	}

	return content.slice(bodyStart, i);
}

/**
 * Parse Zod chain calls to extract validation rules per field.
 */
function parseZodRules(body: string): ZodRule[] {
	const rules: ZodRule[] = [];

	// Match field definitions in z.object({ field: z.type().validation() })
	const fieldRegex = /(\w+)\s*:\s*z\.(\w+)\(([^)]*)\)([^,}\n]*)/g;

	for (const match of body.matchAll(fieldRegex)) {
		const field = match[1];
		const type = match[2];
		const typeArg = match[3];
		const chain = match[4];
		const validations: string[] = [];

		// Type-level rules
		if (type === "string") validations.push("string");
		else if (type === "number") validations.push("number");
		else if (type === "boolean") validations.push("boolean");
		else if (type === "enum") {
			const enumValues = typeArg
				.replace(/[[\]'"]/g, "")
				.split(",")
				.map((v) => v.trim())
				.filter(Boolean);
			if (enumValues.length > 0) {
				validations.push(`one of: ${enumValues.join(", ")}`);
			}
		} else if (type === "array") validations.push("array");

		// Chain validations
		for (const v of chain.matchAll(/\.(\w+)\(([^)]*)\)/g)) {
			const method = v[1];
			const arg = v[2].replace(/['"]/g, "").trim();

			switch (method) {
				case "min":
					validations.push(`min ${arg}`);
					break;
				case "max":
					validations.push(`max ${arg}`);
					break;
				case "email":
					validations.push("valid email");
					break;
				case "url":
					validations.push("valid URL");
					break;
				case "uuid":
					validations.push("UUID format");
					break;
				case "regex":
					validations.push("pattern match");
					break;
				case "optional":
					validations.push("optional");
					break;
				case "nullable":
					validations.push("nullable");
					break;
				case "default":
					validations.push(`default: ${arg}`);
					break;
				case "describe":
					validations.push(arg);
					break;
				case "transform":
					validations.push("transformed");
					break;
				case "refine":
				case "superRefine":
					validations.push("custom validation");
					break;
				case "trim":
					validations.push("trimmed");
					break;
				case "toLowerCase":
					validations.push("lowercased");
					break;
				case "positive":
					validations.push("positive");
					break;
				case "int":
					validations.push("integer");
					break;
				case "nonnegative":
					validations.push("non-negative");
					break;
			}
		}

		if (validations.length > 0) {
			rules.push({ field, type, validations });
		}
	}

	return rules;
}

/**
 * Build a description string from JSDoc and parsed Zod rules.
 */
function buildDescription(
	jsdocDescription: string,
	rules: ZodRule[],
	basename: string,
): string {
	const parts: string[] = [];

	if (jsdocDescription) {
		parts.push(jsdocDescription);
	}

	if (rules.length > 0) {
		const fieldDescriptions = rules
			.map((r) => `\`${r.field}\`: ${r.validations.join(", ")}`)
			.join("; ");
		parts.push(`Fields: ${fieldDescriptions}`);
	}

	if (parts.length === 0) {
		return `Zod validation schema from ${basename}.ts`;
	}

	return parts.join(". ");
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.replace(/[_\s]+/g, "-")
		.toLowerCase();
}
