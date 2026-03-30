import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

export interface SSEData {
	eventTypes: SSEEventType[];
	emitters: SSEEmitter[];
}

export interface SSEEventType {
	name: string;
	type: string;
	fields: { name: string; type: string }[];
}

export interface SSEEmitter {
	service: string;
	method: string;
	eventType: string;
	target: "user" | "organization";
	file: string;
	line: number;
}

export async function extractSSE(rootDir: string): Promise<SSEData> {
	const eventTypes: SSEEventType[] = [];
	const emitters: SSEEmitter[] = [];

	// Parse event types from sse.ts
	const ssePath = path.join(rootDir, "packages/api-server/src/services/sse.ts");
	try {
		const sseContent = readFileSync(ssePath, "utf-8");
		eventTypes.push(...parseEventTypes(sseContent));
	} catch {
		// sse.ts not found
	}

	// Find all SSE emission sites across the codebase
	const serviceFiles = await glob("packages/api-server/src/services/**/*.ts", {
		cwd: rootDir,
	});
	const consumerFiles = await glob(
		"packages/api-server/src/consumers/**/*.ts",
		{ cwd: rootDir },
	);
	const routeFiles = await glob("packages/api-server/src/routes/**/*.ts", {
		cwd: rootDir,
	});

	for (const file of [...serviceFiles, ...consumerFiles, ...routeFiles]) {
		if (file.includes("__tests__")) continue;
		const content = readFileSync(path.join(rootDir, file), "utf-8");
		emitters.push(...parseEmitters(content, file));
	}

	console.log(
		`  Found ${eventTypes.length} SSE event types, ${emitters.length} emission sites`,
	);
	return { eventTypes, emitters };
}

function parseEventTypes(content: string): SSEEventType[] {
	const types: SSEEventType[] = [];

	// Match: export interface FooEvent { type: "foo_bar"; data: { ... } }
	const interfaceRegex =
		/export\s+interface\s+(\w+Event)\s*\{[^}]*type:\s*["'](\w+)["'][^}]*data:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;

	for (const match of content.matchAll(interfaceRegex)) {
		const name = match[1];
		const type = match[2];
		const dataBlock = match[3];

		const fields: { name: string; type: string }[] = [];
		const fieldRegex = /(\w+)\??\s*:\s*([^;\n]+)/g;
		for (const fm of dataBlock.matchAll(fieldRegex)) {
			fields.push({
				name: fm[1],
				type: fm[2].trim().replace(/;$/, ""),
			});
		}

		types.push({ name, type, fields });
	}

	return types;
}

function parseEmitters(content: string, file: string): SSEEmitter[] {
	const emitters: SSEEmitter[] = [];
	const basename = path.basename(file, ".ts");

	// Match: getSSEService().sendToUser(...) or sseService.sendToUser(...)
	// Also: getSSEService().sendToOrganization(...)
	const emitRegex =
		/(?:getSSEService\(\)|sseService)\.sendTo(User|Organization)\([^)]*type:\s*["'](\w+)["']/g;

	for (const match of content.matchAll(emitRegex)) {
		const target = match[1].toLowerCase() as "user" | "organization";
		const eventType = match[2];
		const line = content.slice(0, match.index).split("\n").length;

		emitters.push({
			service: toKebabCase(basename),
			method: `sendTo${match[1]}`,
			eventType,
			target,
			file,
			line,
		});
	}

	// Also match inline object style: { type: "event_name", data: ... }
	const inlineRegex =
		/(?:getSSEService\(\)|sseService)\.sendTo(User|Organization)\(\s*\w+\s*,\s*(?:\w+\s*,\s*)?\{\s*type:\s*["'](\w+)["']/g;

	for (const match of content.matchAll(inlineRegex)) {
		// Avoid duplicates
		const eventType = match[2];
		if (!emitters.some((e) => e.eventType === eventType && e.file === file)) {
			const target = match[1].toLowerCase() as "user" | "organization";
			const line = content.slice(0, match.index).split("\n").length;
			emitters.push({
				service: toKebabCase(basename),
				method: `sendTo${match[1]}`,
				eventType,
				target,
				file,
				line,
			});
		}
	}

	return emitters;
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-z0-9-]/gi, "")
		.toLowerCase();
}
