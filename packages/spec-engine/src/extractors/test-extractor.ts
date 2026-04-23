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
	body: string;
}

interface StepMeta {
	statusCodes: number[];
	errorCodes: string[];
	requestData: string[];
	mockCalls: string[];
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
		const pkg = file.split("/")[1];

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
 * Captures the body of each it block for assertion extraction.
 */
function parseDescribeTree(content: string): DescribeBlock[] {
	const roots: DescribeBlock[] = [];
	const stack: DescribeBlock[] = [];

	const describeRegex = /\bdescribe\s*\(\s*(['"`])((?:(?!\1).)*)\1/g;
	const itRegex = /\bit\s*\(\s*(['"`])((?:(?!\1).)*)\1/g;

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

	tokens.sort((a, b) => a.index - b.index);

	for (const token of tokens) {
		const depth = braceDepthAt(content, token.index);

		if (token.type === "describe") {
			const block: DescribeBlock = {
				name: token.name,
				depth,
				children: [],
				itBlocks: [],
			};

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
			// Capture it block body for assertion extraction
			const body = extractBlockBody(content, token.index);

			if (stack.length > 0) {
				for (let i = stack.length - 1; i >= 0; i--) {
					if (stack[i].depth < depth) {
						stack[i].itBlocks.push({ name: token.name, body });
						break;
					}
				}
			}
		}
	}

	return roots;
}

/**
 * Extract the body of an it/describe block starting from its position.
 * Finds the opening `{` after the callback arrow/function, then captures to matching `}`.
 */
function extractBlockBody(content: string, startIndex: number): string {
	// Find the opening brace of the callback
	let i = startIndex;
	let parenDepth = 0;
	let foundFirstParen = false;

	// Skip past the it('name', and find the callback body
	while (i < content.length) {
		const ch = content[i];
		if (ch === "(") {
			parenDepth++;
			foundFirstParen = true;
		}
		if (ch === ")") parenDepth--;
		if (foundFirstParen && parenDepth === 0) break;

		// Found the callback body opening brace
		if (foundFirstParen && ch === "{" && parenDepth === 1) {
			const bodyStart = i + 1;
			let braceDepth = 1;
			let j = bodyStart;
			let inStr: string | null = null;
			let esc = false;

			while (j < content.length && braceDepth > 0) {
				const c = content[j];
				if (esc) {
					esc = false;
					j++;
					continue;
				}
				if (c === "\\") {
					esc = true;
					j++;
					continue;
				}
				if (inStr) {
					if (c === inStr) inStr = null;
					j++;
					continue;
				}
				if (c === "'" || c === '"' || c === "`") {
					inStr = c;
					j++;
					continue;
				}
				if (c === "{") braceDepth++;
				if (c === "}") braceDepth--;
				j++;
			}

			// Limit body to 2000 chars to avoid memory issues
			return content.slice(bodyStart, Math.min(j - 1, bodyStart + 2000));
		}
		i++;
	}
	return "";
}

/**
 * Extract assertion metadata from an it block body.
 */
function extractStepMeta(body: string): StepMeta {
	const meta: StepMeta = {
		statusCodes: [],
		errorCodes: [],
		requestData: [],
		mockCalls: [],
	};

	// HTTP status codes: .expect(200), expect(status).toBe(400)
	for (const m of body.matchAll(/\.expect\((\d{3})\)/g)) {
		meta.statusCodes.push(Number(m[1]));
	}
	for (const m of body.matchAll(
		/expect\(.*?(?:status|statusCode).*?\)\.toBe\((\d{3})\)/g,
	)) {
		meta.statusCodes.push(Number(m[1]));
	}

	// Error codes: expect(body.code).toBe('LAST_OWNER'), toContain('INV006')
	for (const m of body.matchAll(
		/(?:toBe|toEqual|toContain)\(\s*['"]([A-Z][A-Z0-9_]+)['"]\s*\)/g,
	)) {
		const code = m[1];
		if (
			/^(INV\d+|ERR_|LAST_|CANNOT_|INSUFFICIENT_|MEMBER_|INVALID_)/.test(code)
		) {
			meta.errorCodes.push(code);
		}
	}

	// Request data: .send({ role: 'admin' })
	for (const m of body.matchAll(/\.send\(\s*(\{[^}]{1,200}\})\s*\)/g)) {
		meta.requestData.push(m[1].replace(/\s+/g, " ").trim());
	}

	// Mock service calls: expect(mockService.method).toHaveBeenCalledWith(...)
	for (const m of body.matchAll(/expect\((\w+)\.(\w+)\)\.toHaveBeenCalled/g)) {
		meta.mockCalls.push(`${m[1]}.${m[2]}`);
	}

	return meta;
}

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

	const endpointMatch = block.name.match(
		/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)/,
	);

	for (const child of block.children) {
		const stepMatch = child.name.match(/^Step\s+(\d+):\s*(.*)/i);
		const httpMatch = child.name.match(
			/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)/,
		);

		if (stepMatch) {
			order++;
			const allMeta = mergeStepMeta(child.itBlocks);
			const step: JourneyStep = {
				order,
				actor: inferActor(child.name, filePath),
				action: stepMatch[2],
				description: formatStepDescription(child.itBlocks, allMeta),
			};
			steps.push(step);
			actors.add(step.actor);
			addConstraints(constraints, allMeta, child.itBlocks);
		} else if (httpMatch) {
			order++;
			const allMeta = mergeStepMeta(child.itBlocks);
			const method = httpMatch[1] as
				| "GET"
				| "POST"
				| "PUT"
				| "PATCH"
				| "DELETE";
			const step: JourneyStep = {
				order,
				actor: "user",
				action: cleanActionName(child.name),
				endpoint: { method, path: httpMatch[2] },
				description: formatStepDescription(child.itBlocks, allMeta),
			};
			steps.push(step);
			addConstraints(constraints, allMeta, child.itBlocks);
		} else {
			for (const it of child.itBlocks) {
				order++;
				const meta = extractStepMeta(it.body);
				const step: JourneyStep = {
					order,
					actor: inferActor(it.name, filePath),
					action: cleanItName(it.name),
					endpoint: endpointMatch
						? {
								method: endpointMatch[1] as
									| "GET"
									| "POST"
									| "PUT"
									| "PATCH"
									| "DELETE",
								path: endpointMatch[2],
							}
						: undefined,
					description: formatSingleStepDescription(meta),
				};
				steps.push(step);

				const constraint = extractConstraint(it.name);
				if (constraint) constraints.add(constraint);
				for (const code of meta.errorCodes) {
					constraints.add(toKebabCase(code));
				}
			}
		}
	}

	// If no child describes, use top-level it blocks directly
	if (block.children.length === 0) {
		for (const it of block.itBlocks) {
			order++;
			const meta = extractStepMeta(it.body);
			steps.push({
				order,
				actor: inferActor(it.name, filePath),
				action: cleanItName(it.name),
				endpoint: endpointMatch
					? {
							method: endpointMatch[1] as
								| "GET"
								| "POST"
								| "PUT"
								| "PATCH"
								| "DELETE",
							path: endpointMatch[2],
						}
					: undefined,
				description: formatSingleStepDescription(meta),
			});

			const constraint = extractConstraint(it.name);
			if (constraint) constraints.add(constraint);
			for (const code of meta.errorCodes) {
				constraints.add(toKebabCase(code));
			}
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
 * Merge metadata from all it blocks in a describe group.
 */
function mergeStepMeta(itBlocks: ItBlock[]): StepMeta {
	const merged: StepMeta = {
		statusCodes: [],
		errorCodes: [],
		requestData: [],
		mockCalls: [],
	};
	for (const it of itBlocks) {
		const meta = extractStepMeta(it.body);
		merged.statusCodes.push(...meta.statusCodes);
		merged.errorCodes.push(...meta.errorCodes);
		merged.requestData.push(...meta.requestData);
		merged.mockCalls.push(...meta.mockCalls);
	}
	return merged;
}

/**
 * Add constraints from metadata and it block names.
 */
function addConstraints(
	constraints: Set<string>,
	meta: StepMeta,
	itBlocks: ItBlock[],
): void {
	for (const code of meta.errorCodes) {
		constraints.add(toKebabCase(code));
	}
	for (const it of itBlocks) {
		const constraint = extractConstraint(it.name);
		if (constraint) constraints.add(constraint);
	}
}

/**
 * Format step description with metadata from multiple it blocks.
 */
function formatStepDescription(itBlocks: ItBlock[], meta: StepMeta): string {
	const parts: string[] = [];

	// Test cases
	const cases = itBlocks.map((it) => it.name);
	if (cases.length > 0) {
		parts.push(cases.join("; "));
	}

	// Assertion metadata
	const metaParts = formatMetaParts(meta);
	if (metaParts) parts.push(metaParts);

	return parts.join(" | ");
}

/**
 * Format step description for a single it block.
 */
function formatSingleStepDescription(meta: StepMeta): string {
	return formatMetaParts(meta);
}

function formatMetaParts(meta: StepMeta): string {
	const parts: string[] = [];
	const uniqueStatuses = [...new Set(meta.statusCodes)];
	const uniqueErrors = [...new Set(meta.errorCodes)];
	const uniqueMocks = [...new Set(meta.mockCalls)];

	if (uniqueStatuses.length > 0) {
		parts.push(`HTTP ${uniqueStatuses.join(", ")}`);
	}
	if (uniqueErrors.length > 0) {
		parts.push(`Errors: ${uniqueErrors.join(", ")}`);
	}
	if (uniqueMocks.length > 0) {
		parts.push(`Calls: ${uniqueMocks.slice(0, 5).join(", ")}`);
	}
	if (meta.requestData.length > 0) {
		parts.push(`Input: ${meta.requestData[0]}`);
	}
	return parts.join(" | ");
}

function inferActor(text: string, filePath: string): string {
	const lower = text.toLowerCase();

	if (/webhook|dispatch|send.*event/.test(lower)) return "webhook-service";
	if (/rabbitmq|queue|consumer|message.*received/.test(lower))
		return "rabbitmq-service";
	if (/sse|real.?time|broadcast/.test(lower)) return "sse-service";
	if (/database|query|insert|update.*record/.test(lower)) return "database";
	if (/user|should return|request|submit|navigate/.test(lower)) return "user";

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

function extractConstraint(itName: string): string | null {
	const codeMatch = itName.match(
		/\b(INV\d+|ERR_\w+|LAST_OWNER|INSUFFICIENT_PERMISSIONS|CANNOT_\w+|MEMBER_NOT_FOUND)\b/,
	);
	if (codeMatch) return toKebabCase(codeMatch[1]);

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
