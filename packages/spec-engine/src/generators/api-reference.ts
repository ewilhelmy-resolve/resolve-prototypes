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

	writeFileSync(path.join(outputDir, "api-reference.md"), md);
}
