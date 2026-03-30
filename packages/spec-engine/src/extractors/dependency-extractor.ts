import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

export interface DependencyData {
	edges: DependencyEdge[];
}

export interface DependencyEdge {
	from: string;
	to: string;
	type: "import" | "method-call";
	file: string;
}

export async function extractDependencies(
	rootDir: string,
): Promise<DependencyData> {
	const edges: DependencyEdge[] = [];

	const serviceFiles = await glob("packages/api-server/src/services/*.ts", {
		cwd: rootDir,
	});
	const consumerFiles = await glob("packages/api-server/src/consumers/*.ts", {
		cwd: rootDir,
	});
	const routeFiles = await glob("packages/api-server/src/routes/*.ts", {
		cwd: rootDir,
	});

	for (const file of [...serviceFiles, ...consumerFiles, ...routeFiles]) {
		if (file.includes("__tests__")) continue;
		const content = readFileSync(path.join(rootDir, file), "utf-8");
		const basename = path.basename(file, ".ts");
		const from = toKebabCase(basename);

		edges.push(...parseImportEdges(content, from, file));
	}

	// Deduplicate
	const seen = new Set<string>();
	const unique = edges.filter((e) => {
		const key = `${e.from}->${e.to}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	console.log(`  Found ${unique.length} service dependency edges`);
	return { edges: unique };
}

function parseImportEdges(
	content: string,
	from: string,
	file: string,
): DependencyEdge[] {
	const edges: DependencyEdge[] = [];

	// Match imports from sibling services/consumers/middleware
	const importRegex =
		/import\s+(?:\{[^}]+\}|[\w]+)\s+from\s+["'](?:\.\.?\/)+(?:services|consumers|middleware|config)\/(\w+)(?:\.js)?["']/g;

	for (const match of content.matchAll(importRegex)) {
		const to = toKebabCase(match[1]);
		// Skip self-imports and config imports
		if (to !== from && to !== "database" && to !== "logger") {
			edges.push({ from, to, type: "import", file });
		}
	}

	// Match getter function calls: getSSEService(), getSessionService(), etc.
	const getterRegex = /get(\w+Service)\(\)/g;
	for (const match of content.matchAll(getterRegex)) {
		const to = toKebabCase(match[1]);
		if (to !== from) {
			edges.push({ from, to, type: "method-call", file });
		}
	}

	return edges;
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-z0-9-]/gi, "")
		.toLowerCase();
}
