import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import type { Journey, JourneyStep } from "../types/avcj.js";

export interface TestData {
	journeys: Journey[];
}

interface DescribeBlock {
	name: string;
	depth: number;
	children: DescribeBlock[];
	itBlocks: ItBlock[];
}

interface ItBlock {
	name: string;
}

export async function extractTests(rootDir: string): Promise<TestData> {
	const journeys: Journey[] = [];

	const testFiles = await glob("packages/*/src/**/*.test.{ts,tsx}", {
		cwd: rootDir,
	});

	console.log(`  Scanning ${testFiles.length} test files for journeys...`);

	for (const file of testFiles) {
		const content = readFileSync(path.join(rootDir, file), "utf-8");
		const tree = parseDescribeTree(content);
		const pkg = file.split("/")[1]; // api-server, client, etc.

		for (const block of tree) {
			const journey = blockToJourney(block, file, pkg);
			if (journey && journey.steps.length > 0) {
				journeys.push(journey);
			}
		}
	}

	console.log(`  Found ${journeys.length} test-based journeys`);
	return { journeys };
}

/**
 * Parse describe/it blocks into a tree structure using brace counting.
 * Handles nested describes and extracts it blocks at each level.
 */
function parseDescribeTree(content: string): DescribeBlock[] {
	const roots: DescribeBlock[] = [];
	const stack: DescribeBlock[] = [];

	// Match describe('...') or describe("...") or describe(`...`)
	const describeRegex = /\bdescribe\s*\(\s*(['"`])((?:(?!\1).)*)\1/g;
	const itRegex = /\bit\s*\(\s*(['"`])((?:(?!\1).)*)\1/g;

	// Collect all describe and it positions
	const tokens: Array<{
		type: "describe" | "it";
		name: string;
		index: number;
	}> = [];

	for (const match of content.matchAll(describeRegex)) {
		tokens.push({ type: "describe", name: match[2], index: match.index });
	}
	for (const match of content.matchAll(itRegex)) {
		tokens.push({ type: "it", name: match[2], index: match.index });
	}

	// Sort by position in file
	tokens.sort((a, b) => a.index - b.index);

	// Use brace counting to determine nesting
	for (const token of tokens) {
		const depth = braceDepthAt(content, token.index);

		if (token.type === "describe") {
			const block: DescribeBlock = {
				name: token.name,
				depth,
				children: [],
				itBlocks: [],
			};

			// Pop stack until we find a parent at a lower depth
			while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
				stack.pop();
			}

			if (stack.length > 0) {
				stack[stack.length - 1].children.push(block);
			} else {
				roots.push(block);
			}
			stack.push(block);
		} else {
			// it block — attach to nearest describe on stack
			if (stack.length > 0) {
				// Find the describe whose depth is just below this it's depth
				for (let i = stack.length - 1; i >= 0; i--) {
					if (stack[i].depth < depth) {
						stack[i].itBlocks.push({ name: token.name });
						break;
					}
				}
			}
		}
	}

	return roots;
}

/**
 * Count the brace depth at a given position in the source.
 */
function braceDepthAt(content: string, position: number): number {
	let depth = 0;
	let inString: string | null = null;
	let escaped = false;

	for (let i = 0; i < position; i++) {
		const ch = content[i];

		if (escaped) {
			escaped = false;
			continue;
		}
		if (ch === "\\") {
			escaped = true;
			continue;
		}

		if (inString) {
			if (ch === inString) inString = null;
			continue;
		}

		if (ch === "'" || ch === '"' || ch === "`") {
			inString = ch;
			continue;
		}

		if (ch === "{") depth++;
		if (ch === "}") depth--;
	}

	return depth;
}

/**
 * Convert a top-level describe block into a Journey.
 * Child describes or it blocks become journey steps.
 */
function blockToJourney(
	block: DescribeBlock,
	filePath: string,
	pkg: string,
): Journey | null {
	const steps: JourneyStep[] = [];
	const actors = new Set<string>();
	const constraints = new Set<string>();
	let order = 0;

	// Extract endpoint from describe name if present (e.g., "GET /api/organizations/members")
	const endpointMatch = block.name.match(
		/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)/,
	);

	// Process child describes as step groups
	for (const child of block.children) {
		// Check if child describe name contains a step indicator
		const stepMatch = child.name.match(/^Step\s+(\d+):\s*(.*)/i);
		const httpMatch = child.name.match(
			/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)/,
		);

		if (stepMatch) {
			// Explicit step: "Step 1: RabbitMQ message creates form request"
			order++;
			const step: JourneyStep = {
				order,
				actor: inferActor(child.name, filePath),
				action: stepMatch[2],
				description: child.itBlocks.map((it) => it.name).join("; "),
			};
			steps.push(step);
			actors.add(step.actor);
		} else if (httpMatch) {
			// HTTP endpoint describe: "PATCH /api/organizations/members/:userId/role"
			order++;
			const step: JourneyStep = {
				order,
				actor: "user",
				action: cleanActionName(child.name),
				endpoint: {
					method: httpMatch[1] as JourneyStep["endpoint"] extends {
						method: infer M;
					}
						? M
						: never,
					path: httpMatch[2],
				},
				description: child.itBlocks.map((it) => it.name).join("; "),
			};
			steps.push(step);

			// Extract constraints from error-case it blocks
			for (const it of child.itBlocks) {
				const constraint = extractConstraint(it.name);
				if (constraint) constraints.add(constraint);
			}
		} else {
			// Regular describe — each it block becomes a step
			for (const it of child.itBlocks) {
				order++;
				const step: JourneyStep = {
					order,
					actor: inferActor(it.name, filePath),
					action: cleanItName(it.name),
					description: "",
				};
				if (endpointMatch) {
					step.endpoint = {
						method: endpointMatch[1] as JourneyStep["endpoint"] extends {
							method: infer M;
						}
							? M
							: never,
						path: endpointMatch[2],
					};
				}
				steps.push(step);

				const constraint = extractConstraint(it.name);
				if (constraint) constraints.add(constraint);
			}
		}
	}

	// If no child describes, use top-level it blocks directly
	if (block.children.length === 0) {
		for (const it of block.itBlocks) {
			order++;
			steps.push({
				order,
				actor: inferActor(it.name, filePath),
				action: cleanItName(it.name),
				endpoint: endpointMatch
					? {
							method: endpointMatch[1] as JourneyStep["endpoint"] extends {
								method: infer M;
							}
								? M
								: never,
							path: endpointMatch[2],
						}
					: undefined,
				description: "",
			});

			const constraint = extractConstraint(it.name);
			if (constraint) constraints.add(constraint);
		}
	}

	if (steps.length === 0) return null;

	const id = `test-${toKebabCase(block.name)}`;

	return {
		id,
		name: block.name,
		description: `Documented by tests in ${filePath}`,
		steps,
		actors: [...actors],
		views: [],
		constraints: [...constraints],
		tags: ["test-documented", pkg],
	};
}

/**
 * Infer which actor performs a step based on the test name and file path.
 */
function inferActor(text: string, filePath: string): string {
	const lower = text.toLowerCase();

	if (/webhook|dispatch|send.*event/.test(lower)) return "webhook-service";
	if (/rabbitmq|queue|consumer|message.*received/.test(lower))
		return "rabbitmq-service";
	if (/sse|real.?time|broadcast/.test(lower)) return "sse-service";
	if (/database|query|insert|update.*record/.test(lower)) return "database";
	if (/user|should return|request|submit|navigate/.test(lower)) return "user";

	// Infer from file path
	if (filePath.includes("services/")) {
		const serviceName = filePath.match(/(\w+)\.test/)?.[1];
		return serviceName ? toKebabCase(serviceName) : "service";
	}
	if (filePath.includes("consumers/")) return "consumer";
	if (filePath.includes("routes/")) return "user";
	if (filePath.includes("pages/") || filePath.includes("components/"))
		return "user";

	return "system";
}

/**
 * Extract constraint identifiers from error-related test names.
 */
function extractConstraint(itName: string): string | null {
	// Match explicit error codes: INV001, LAST_OWNER, etc.
	const codeMatch = itName.match(
		/\b(INV\d+|ERR_\w+|LAST_OWNER|INSUFFICIENT_PERMISSIONS|CANNOT_\w+|MEMBER_NOT_FOUND)\b/,
	);
	if (codeMatch) return toKebabCase(codeMatch[1]);

	// Match HTTP error patterns
	if (/should return [45]\d\d/.test(itName)) {
		const reason = itName
			.replace(/should return [45]\d\d\s*(when|for|if)?\s*/, "")
			.trim();
		if (reason) return `validation-${toKebabCase(reason.slice(0, 40))}`;
	}

	return null;
}

function cleanItName(name: string): string {
	return name.replace(/^should\s+/, "").replace(/^it\s+/, "");
}

function cleanActionName(name: string): string {
	return name
		.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/, "")
		.replace(/\/api\//, "")
		.replace(/\/:?\w+/g, (m) => (m.startsWith("/:") ? "" : m));
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-z0-9-]/gi, "")
		.toLowerCase();
}
