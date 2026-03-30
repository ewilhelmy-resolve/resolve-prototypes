import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

export interface RabbitMQData {
	queues: QueueSpec[];
	messageTypes: MessageTypeSpec[];
}

export interface QueueSpec {
	name: string;
	envVar: string;
	consumer: string;
	consumerFile: string;
	durable: boolean;
}

export interface MessageTypeSpec {
	queue: string;
	type: string;
	fields: string[];
	consumer: string;
	file: string;
}

export async function extractRabbitMQ(rootDir: string): Promise<RabbitMQData> {
	const queues: QueueSpec[] = [];
	const messageTypes: MessageTypeSpec[] = [];

	// Parse queue definitions from rabbitmq.ts
	const rabbitmqPath = path.join(
		rootDir,
		"packages/api-server/src/services/rabbitmq.ts",
	);
	try {
		const content = readFileSync(rabbitmqPath, "utf-8");
		queues.push(...parseQueues(content));
	} catch {
		// File not found
	}

	// Parse consumer files for queue definitions and message types
	const consumerFiles = await glob("packages/api-server/src/consumers/*.ts", {
		cwd: rootDir,
	});

	for (const file of consumerFiles) {
		if (file.includes("__tests__")) continue;
		const content = readFileSync(path.join(rootDir, file), "utf-8");
		const basename = path.basename(file, ".ts");

		// Extract queue definitions from consumers
		queues.push(
			...parseQueues(content).map((q) => ({
				...q,
				consumer: toKebabCase(basename),
				consumerFile: file,
			})),
		);

		messageTypes.push(...parseMessageTypes(content, basename, file));
	}

	// Also parse rabbitmq.ts for inline consumer message handling
	try {
		const content = readFileSync(rabbitmqPath, "utf-8");
		messageTypes.push(
			...parseInlineMessages(content, "rabbitmq-service", rabbitmqPath),
		);
	} catch {
		// File not found
	}

	console.log(
		`  Found ${queues.length} RabbitMQ queues, ${messageTypes.length} message types`,
	);
	return { queues, messageTypes };
}

function parseQueues(content: string): QueueSpec[] {
	const queues: QueueSpec[] = [];

	// Match: process.env.QUEUE_NAME || "chat.responses"
	// or: const QUEUE = process.env.FOO || "bar"
	const envQueueRegex = /(?:process\.env\.(\w+)\s*\|\|\s*["']([^"']+)["'])/g;

	for (const match of content.matchAll(envQueueRegex)) {
		const envVar = match[1];
		const defaultName = match[2];

		// Only capture queue-like names
		if (
			/queue|responses|events|processing|status/i.test(envVar) ||
			/\.\w+$/.test(defaultName)
		) {
			queues.push({
				name: defaultName,
				envVar,
				consumer: inferConsumer(defaultName),
				consumerFile: "",
				durable: true,
			});
		}
	}

	// Also match assertQueue calls: channel.assertQueue("name", { durable: true })
	const assertRegex = /assertQueue\(\s*(?:this\.\w+|(\w+)|["']([^"']+)["'])/g;
	for (const match of content.matchAll(assertRegex)) {
		const queueRef = match[2];
		if (queueRef && !queues.some((q) => q.name === queueRef)) {
			queues.push({
				name: queueRef,
				envVar: "",
				consumer: inferConsumer(queueRef),
				consumerFile: "",
				durable: true,
			});
		}
	}

	return queues;
}

function parseMessageTypes(
	content: string,
	consumerName: string,
	file: string,
): MessageTypeSpec[] {
	const types: MessageTypeSpec[] = [];

	// Match interface/type definitions with type discriminator
	const typeFieldRegex = /type:\s*["'](\w+)["']/g;

	const seen = new Set<string>();
	for (const match of content.matchAll(typeFieldRegex)) {
		const typeName = match[1];
		if (seen.has(typeName)) continue;
		seen.add(typeName);

		// Extract surrounding fields from the interface
		const contextStart = Math.max(0, match.index - 500);
		const contextEnd = Math.min(content.length, match.index + 500);
		const context = content.slice(contextStart, contextEnd);

		const fields: string[] = [];
		const fieldRegex = /(\w+)\s*[?]?:\s*([^;\n,}]+)/g;
		for (const fm of context.matchAll(fieldRegex)) {
			const fieldName = fm[1];
			if (
				fieldName !== "type" &&
				!fieldName.startsWith("//") &&
				/^[a-z]/.test(fieldName)
			) {
				fields.push(fieldName);
			}
		}

		// Infer queue from consumer name
		const queue = inferQueue(consumerName);

		types.push({
			queue,
			type: typeName,
			fields: [...new Set(fields)].slice(0, 15),
			consumer: toKebabCase(consumerName),
			file,
		});
	}

	return types;
}

function parseInlineMessages(
	content: string,
	serviceName: string,
	file: string,
): MessageTypeSpec[] {
	const types: MessageTypeSpec[] = [];

	// Match message handling patterns: if (type === "foo") or case "foo":
	const caseRegex = /(?:type\s*===?\s*["'](\w+)["']|case\s+["'](\w+)["'])/g;

	const seen = new Set<string>();
	for (const match of content.matchAll(caseRegex)) {
		const typeName = match[1] || match[2];
		if (seen.has(typeName)) continue;
		seen.add(typeName);

		// Skip common non-message types
		if (/^(string|number|boolean|object|undefined|null)$/.test(typeName))
			continue;

		types.push({
			queue: "chat.responses",
			type: typeName,
			fields: [],
			consumer: serviceName,
			file,
		});
	}

	return types;
}

function inferConsumer(queueName: string): string {
	const map: Record<string, string> = {
		"chat.responses": "rabbitmq-service",
		data_source_status: "data-source-status-consumer",
		"document.processing": "document-processing-consumer",
		"workflow.responses": "workflow-consumer",
		"cluster.events": "cluster-events-consumer",
	};
	return map[queueName] || "unknown";
}

function inferQueue(consumerName: string): string {
	const lower = consumerName.toLowerCase();
	if (lower.includes("datasource") || lower.includes("data-source"))
		return "data_source_status";
	if (lower.includes("document")) return "document.processing";
	if (lower.includes("workflow")) return "workflow.responses";
	if (lower.includes("cluster")) return "cluster.events";
	return "chat.responses";
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-z0-9-]/gi, "")
		.toLowerCase();
}
