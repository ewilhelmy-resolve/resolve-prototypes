import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Lexicon } from "../types/lexicon.js";

export async function generateApiReference(
	lexicon: Lexicon,
	outputDir: string,
): Promise<void> {
	mkdirSync(outputDir, { recursive: true });

	const endpoints = lexicon.endpoints || [];
	const sseEvents = lexicon.sseEvents || [];
	const sseEmitters = lexicon.sseEmitters || [];

	let md = "# API Reference\n\n";
	md += `> Auto-generated on ${new Date().toISOString().split("T")[0]}\n\n`;

	// Endpoints by tag
	if (endpoints.length > 0) {
		md += `## REST Endpoints (${endpoints.length})\n\n`;

		const byTag = new Map<string, typeof endpoints>();
		for (const ep of endpoints) {
			const tag = ep.tags[0] || "Other";
			if (!byTag.has(tag)) byTag.set(tag, []);
			byTag.get(tag)?.push(ep);
		}

		for (const [tag, eps] of [...byTag.entries()].sort()) {
			md += `### ${tag}\n\n`;
			md += "| Method | Path | Summary | Auth | Schemas |\n";
			md += "|--------|------|---------|------|---------|\n";

			for (const ep of eps) {
				const auth = ep.auth.authenticated
					? ep.auth.roles.length > 0
						? `${ep.auth.roles.join(", ")}`
						: "authenticated"
					: "public";
				const schemas = [
					...ep.requestSchemas,
					...ep.responseSchemas.map((r) => `${r.status}:${r.schema}`),
				].join(", ");
				md += `| \`${ep.method}\` | \`${ep.path}\` | ${ep.summary || "—"} | ${auth} | ${schemas || "—"} |\n`;
			}
			md += "\n";
		}
	}

	// SSE Events
	if (sseEvents.length > 0) {
		md += `## SSE Events (${sseEvents.length})\n\n`;

		for (const event of sseEvents) {
			md += `### \`${event.type}\`\n\n`;

			if (event.fields.length > 0) {
				md += "| Field | Type |\n";
				md += "|-------|------|\n";
				for (const field of event.fields) {
					md += `| \`${field.name}\` | \`${field.type}\` |\n`;
				}
				md += "\n";
			}

			// Show which services emit this event
			const eventEmitters = sseEmitters.filter(
				(e) => e.eventType === event.type,
			);
			if (eventEmitters.length > 0) {
				md += "**Emitted by:** ";
				md += eventEmitters
					.map((e) => `\`${e.service}\` → ${e.target}`)
					.join(", ");
				md += "\n\n";
			}
		}
	}

	// SSE Emitter Summary
	if (sseEmitters.length > 0) {
		md += `## SSE Emission Map (${sseEmitters.length} sites)\n\n`;
		md += "| Service | Event | Target | Source |\n";
		md += "|---------|-------|--------|--------|\n";
		for (const e of sseEmitters) {
			md += `| \`${e.service}\` | \`${e.eventType}\` | ${e.target} | \`${e.file}:${e.line}\` |\n`;
		}
		md += "\n";
	}

	// React Hooks
	const hooks = lexicon.hooks || [];
	if (hooks.length > 0) {
		md += `## React Hooks (${hooks.length})\n\n`;
		md += "| Hook | Type | API Calls | Cache Keys | Invalidates |\n";
		md += "|------|------|-----------|------------|-------------|\n";
		for (const h of hooks) {
			md += `| \`${h.name}\` | ${h.type} | ${h.apiCalls.join(", ") || "—"} | ${h.queryKeys.join(", ") || "—"} | ${h.invalidates.join(", ") || "—"} |\n`;
		}
		md += "\n";
	}

	// Service Dependencies
	const deps = lexicon.dependencies || [];
	if (deps.length > 0) {
		md += `## Service Dependencies (${deps.length} edges)\n\n`;
		md += "| From | To | Type |\n";
		md += "|------|----|------|\n";
		for (const d of deps) {
			md += `| \`${d.from}\` | \`${d.to}\` | ${d.type} |\n`;
		}
		md += "\n";
	}

	// RabbitMQ
	const rmq = lexicon.rabbitmq;
	if (rmq) {
		if (rmq.queues.length > 0) {
			md += `## RabbitMQ Queues (${rmq.queues.length})\n\n`;
			md += "| Queue | Consumer | Env Var | Durable |\n";
			md += "|-------|----------|---------|--------|\n";
			for (const q of rmq.queues) {
				md += `| \`${q.name}\` | \`${q.consumer}\` | \`${q.envVar || "—"}\` | ${q.durable ? "yes" : "no"} |\n`;
			}
			md += "\n";
		}

		if (rmq.messageTypes.length > 0) {
			md += `## Message Types (${rmq.messageTypes.length})\n\n`;
			md += "| Type | Queue | Consumer | Fields |\n";
			md += "|------|-------|----------|--------|\n";
			for (const m of rmq.messageTypes) {
				md += `| \`${m.type}\` | \`${m.queue}\` | \`${m.consumer}\` | ${m.fields.slice(0, 6).join(", ") || "—"} |\n`;
			}
			md += "\n";
		}
	}

	writeFileSync(path.join(outputDir, "api-reference.md"), md);
}
