import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

export interface HookData {
	hooks: HookSpec[];
}

export interface HookSpec {
	name: string;
	file: string;
	type: "query" | "mutation" | "infinite";
	apiCalls: string[];
	queryKeys: string[];
	invalidates: string[];
}

export async function extractHooks(rootDir: string): Promise<HookData> {
	const hooks: HookSpec[] = [];

	const hookFiles = await glob("packages/client/src/hooks/api/*.ts", {
		cwd: rootDir,
	});

	for (const file of hookFiles) {
		const content = readFileSync(path.join(rootDir, file), "utf-8");
		hooks.push(...parseHooks(content, file));
	}

	console.log(`  Found ${hooks.length} React hooks with API bindings`);
	return { hooks };
}

function parseHooks(content: string, file: string): HookSpec[] {
	const hooks: HookSpec[] = [];

	// Match exported hook functions: export function useFoo(
	const hookRegex = /export\s+function\s+(use\w+)\s*\([^)]*\)\s*\{/g;

	for (const match of content.matchAll(hookRegex)) {
		const name = match[1];
		const bodyStart = match.index + match[0].length;
		const body = extractFunctionBody(content, bodyStart);

		// Determine hook type
		let type: HookSpec["type"] = "query";
		if (/useMutation/.test(body)) type = "mutation";
		else if (/useInfiniteQuery/.test(body)) type = "infinite";

		// Extract API calls: fooApi.method(...)
		const apiCalls: string[] = [];
		for (const m of body.matchAll(/(\w+Api)\.(\w+)/g)) {
			apiCalls.push(`${m[1]}.${m[2]}`);
		}

		// Extract query keys: queryKey: fooKeys.list(...)
		const queryKeys: string[] = [];
		for (const m of body.matchAll(/queryKey:\s*(\w+Keys?\.\w+)/g)) {
			queryKeys.push(m[1]);
		}

		// Extract invalidations: invalidateQueries({ queryKey: fooKeys... })
		const invalidates: string[] = [];
		for (const m of body.matchAll(
			/invalidateQueries\(\s*\{\s*queryKey:\s*(\w+Keys?\.\w+)/g,
		)) {
			invalidates.push(m[1]);
		}

		if (apiCalls.length > 0 || queryKeys.length > 0) {
			hooks.push({ name, file, type, apiCalls, queryKeys, invalidates });
		}
	}

	return hooks;
}

function extractFunctionBody(content: string, startIndex: number): string {
	let depth = 1;
	let i = startIndex;
	let inString: string | null = null;
	let escaped = false;

	while (i < content.length && depth > 0) {
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
		if (ch === "}") depth--;
		i++;

		if (i - startIndex > 5000) break;
	}

	return content.slice(startIndex, i);
}
