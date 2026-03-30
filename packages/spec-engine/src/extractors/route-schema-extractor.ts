import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

export interface RouteSchemaData {
	endpoints: EndpointSpec[];
}

export interface EndpointSpec {
	method: string;
	path: string;
	summary: string;
	description: string;
	tags: string[];
	requestSchemas: string[];
	responseSchemas: { status: number; schema: string }[];
	auth: AuthSpec;
	file: string;
	line: number;
}

export interface AuthSpec {
	authenticated: boolean;
	roles: string[];
}

export async function extractRouteSchemas(
	rootDir: string,
): Promise<RouteSchemaData> {
	const endpoints: EndpointSpec[] = [];

	const routeFiles = await glob("packages/api-server/src/routes/*.ts", {
		cwd: rootDir,
	});

	for (const file of routeFiles) {
		const basename = path.basename(file, ".ts");
		if (basename === "index") continue;

		const content = readFileSync(path.join(rootDir, file), "utf-8");

		// Extract registry.registerPath() calls
		const registryEndpoints = parseRegistryPaths(content, file);
		endpoints.push(...registryEndpoints);

		// Extract middleware from route handlers
		enrichWithMiddleware(content, endpoints);
	}

	console.log(`  Found ${endpoints.length} API endpoints with schema bindings`);
	return { endpoints };
}

function parseRegistryPaths(content: string, file: string): EndpointSpec[] {
	const endpoints: EndpointSpec[] = [];

	// Match registry.registerPath({ ... }) blocks
	const registerRegex = /registry\.registerPath\(\s*\{/g;

	for (const match of content.matchAll(registerRegex)) {
		const blockStart = match.index + match[0].length - 1;
		const block = extractBalancedBraces(content, blockStart);
		if (!block) continue;

		const line = content.slice(0, match.index).split("\n").length;

		const method = extractStringField(block, "method") || "get";
		const routePath = extractStringField(block, "path") || "";
		const summary = extractStringField(block, "summary") || "";
		const description = extractStringField(block, "description") || "";
		const tags = extractArrayField(block, "tags");

		// Extract request schemas
		const requestSchemas: string[] = [];
		const bodySchemaMatch = block.match(/schema:\s*(\w+Schema)/);
		if (bodySchemaMatch) requestSchemas.push(bodySchemaMatch[1]);

		const querySchemaMatch = block.match(/query:\s*(\w+Schema)/);
		if (querySchemaMatch) requestSchemas.push(querySchemaMatch[1]);

		// Extract response schemas
		const responseSchemas: { status: number; schema: string }[] = [];
		const responseRegex = /(\d{3}):\s*\{[^}]*schema:\s*(\w+Schema)/g;
		for (const rm of block.matchAll(responseRegex)) {
			responseSchemas.push({
				status: Number(rm[1]),
				schema: rm[2],
			});
		}

		endpoints.push({
			method: method.toUpperCase(),
			path: routePath,
			summary,
			description,
			tags,
			requestSchemas,
			responseSchemas,
			auth: { authenticated: false, roles: [] },
			file,
			line,
		});
	}

	return endpoints;
}

/**
 * Parse Express route handlers to extract middleware (authenticateUser, requireRole).
 * Matches patterns like: router.get("/", authenticateUser, requireRole(["owner"]), handler)
 */
function enrichWithMiddleware(
	content: string,
	endpoints: EndpointSpec[],
): void {
	const handlerRegex =
		/router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;

	for (const match of content.matchAll(handlerRegex)) {
		const method = match[1].toUpperCase();
		// Normalize route path: convert :param to {param} for OpenAPI matching
		const routePath = `/api${match[2] === "/" ? "" : match[2]}`;
		const normalizedPath = routePath.replace(/:(\w+)/g, "{$1}");

		// Get the rest of the line + next few lines to find middleware
		const afterMatch = content.slice(match.index, match.index + 500);
		const hasAuth = /authenticateUser/.test(afterMatch.split("async")[0] || "");
		const roleMatch = afterMatch.match(/requireRole\(\s*\[([^\]]+)\]/);
		const roles = roleMatch
			? roleMatch[1]
					.replace(/['"]/g, "")
					.split(",")
					.map((r) => r.trim())
					.filter(Boolean)
			: [];

		// Find matching endpoint by method and path similarity
		const endpoint = endpoints.find((e) => {
			const ePath = e.path.replace(/\{(\w+)\}/g, ":$1");
			return (
				e.method === method &&
				(e.path === normalizedPath ||
					ePath === routePath ||
					e.path.endsWith(match[2]))
			);
		});

		if (endpoint) {
			endpoint.auth = { authenticated: hasAuth, roles };
		}
	}
}

function extractBalancedBraces(
	content: string,
	startIndex: number,
): string | null {
	let depth = 0;
	let i = startIndex;
	let inString: string | null = null;
	let escaped = false;

	while (i < content.length) {
		const ch = content[i];

		if (escaped) {
			escaped = false;
			i++;
			continue;
		}
		if (ch === "\\") {
			escaped = true;
			i++;
			continue;
		}
		if (inString) {
			if (ch === inString) inString = null;
			i++;
			continue;
		}
		if (ch === "'" || ch === '"' || ch === "`") {
			inString = ch;
			i++;
			continue;
		}

		if (ch === "{") depth++;
		if (ch === "}") {
			depth--;
			if (depth === 0) {
				return content.slice(startIndex, i + 1);
			}
		}
		i++;

		if (i - startIndex > 10000) return null;
	}
	return null;
}

function extractStringField(block: string, field: string): string | null {
	const regex = new RegExp(`${field}:\\s*["'\`]([^"'\`]+)["'\`]`);
	const match = block.match(regex);
	return match ? match[1] : null;
}

function extractArrayField(block: string, field: string): string[] {
	const regex = new RegExp(`${field}:\\s*\\[([^\\]]+)\\]`);
	const match = block.match(regex);
	if (!match) return [];
	return match[1]
		.replace(/['"]/g, "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}
