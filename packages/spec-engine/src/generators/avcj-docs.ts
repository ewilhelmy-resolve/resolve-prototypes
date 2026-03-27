import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Actor, Constraint, Journey, View } from "../types/avcj.js";
import type { Lexicon } from "../types/lexicon.js";

export async function generateAvcjDocs(lexicon: Lexicon, outputDir: string) {
	const dirs = ["actors", "views", "journeys", "constraints"];
	for (const dir of dirs) {
		mkdirSync(path.join(outputDir, dir), { recursive: true });
	}

	for (const actor of lexicon.actors) {
		writeFileSync(
			path.join(outputDir, "actors", `${actor.id}.md`),
			renderActor(actor),
		);
	}
	console.log(chalk.green(`  Generated: ${lexicon.actors.length} actor docs`));

	for (const view of lexicon.views) {
		writeFileSync(
			path.join(outputDir, "views", `${view.id}.md`),
			renderView(view),
		);
	}
	console.log(chalk.green(`  Generated: ${lexicon.views.length} view docs`));

	for (const journey of lexicon.journeys) {
		writeFileSync(
			path.join(outputDir, "journeys", `${journey.id}.md`),
			renderJourney(journey),
		);
	}
	console.log(
		chalk.green(`  Generated: ${lexicon.journeys.length} journey docs`),
	);

	for (const constraint of lexicon.constraints) {
		writeFileSync(
			path.join(outputDir, "constraints", `${constraint.id}.md`),
			renderConstraint(constraint),
		);
	}
	console.log(
		chalk.green(`  Generated: ${lexicon.constraints.length} constraint docs`),
	);

	// Generate README TOC
	writeFileSync(path.join(outputDir, "README.md"), renderReadme(lexicon));
	console.log(chalk.green("  Generated: README.md"));
}

function renderActor(actor: Actor): string {
	const frontmatter = [
		"---",
		"type: actor",
		`id: ${actor.id}`,
		`name: ${actor.name}`,
		`kind: ${actor.kind}`,
		`package: ${actor.sources[0]?.package || "unknown"}`,
		"auto_generated: true",
		"---",
	].join("\n");

	let body = `\n\n# ${actor.name}\n\n${actor.description || "*No description.*"}\n`;

	if (actor.methods.length > 0) {
		body += "\n## Methods\n\n";
		body += "| Method | Description |\n|--------|-------------|\n";
		for (const m of actor.methods) {
			body += `| ${m.name} | ${m.description || "—"} |\n`;
		}
	}

	body += "\n## Source\n\n";
	for (const s of actor.sources) {
		body += `- \`${s.file}:${s.line}\`\n`;
	}

	return frontmatter + body;
}

function renderView(view: View): string {
	const frontmatter = [
		"---",
		"type: view",
		`id: ${view.id}`,
		`name: ${view.name}`,
		`kind: ${view.kind}`,
		view.route ? `route: "${view.route}"` : null,
		view.storybookPath ? `storybook: "${view.storybookPath}"` : null,
		`package: ${view.sources[0]?.package || "client"}`,
		"auto_generated: true",
		"---",
	]
		.filter(Boolean)
		.join("\n");

	let body = `\n\n# ${view.name}\n\n${view.description || "*No description.*"}\n`;

	if (view.props.length > 0) {
		body += "\n## Props\n\n";
		body +=
			"| Prop | Type | Required | Description |\n|------|------|----------|-------------|\n";
		for (const p of view.props) {
			body += `| ${p.name} | \`${p.type}\` | ${p.required ? "Yes" : "No"} | ${p.description || "—"} |\n`;
		}
	}

	if (view.storybookPath) {
		body += `\n## Storybook\n\n[View in Storybook](${view.storybookPath})\n`;
	}

	body += "\n## Source\n\n";
	for (const s of view.sources) {
		body += `- \`${s.file}:${s.line}\`\n`;
	}

	return frontmatter + body;
}

function renderJourney(journey: Journey): string {
	const frontmatter = [
		"---",
		"type: journey",
		`id: ${journey.id}`,
		`name: "${journey.name}"`,
		`actors: [${journey.actors.map((a) => `"${a}"`).join(", ")}]`,
		`views: [${journey.views.map((v) => `"${v}"`).join(", ")}]`,
		`constraints: [${journey.constraints.map((c) => `"${c}"`).join(", ")}]`,
		"auto_generated: true",
		"---",
	].join("\n");

	let body = `\n\n# ${journey.name}\n\n${journey.description || "*No description.*"}\n`;

	if (journey.steps.length > 0) {
		body += "\n## Steps\n\n";
		for (const step of journey.steps) {
			body += `${step.order}. **${step.actor}** — ${step.action}`;
			if (step.endpoint) {
				body += ` (\`${step.endpoint.method} ${step.endpoint.path}\`)`;
			}
			body += "\n";
		}
	}

	return frontmatter + body;
}

function renderConstraint(constraint: Constraint): string {
	const frontmatter = [
		"---",
		"type: constraint",
		`id: ${constraint.id}`,
		`name: ${constraint.name}`,
		`kind: ${constraint.kind}`,
		`enforcement: ${constraint.enforcement}`,
		`package: ${constraint.sources[0]?.package || "unknown"}`,
		"auto_generated: true",
		"---",
	].join("\n");

	let body = `\n\n# ${constraint.name}\n\n${constraint.description || "*No description.*"}\n`;

	body += "\n## Source\n\n";
	for (const s of constraint.sources) {
		body += `- \`${s.file}:${s.line}\`\n`;
	}

	return frontmatter + body;
}

function renderReadme(lexicon: Lexicon): string {
	let md = "# Rita Living Specification\n\n";
	md += `> Auto-generated on ${new Date().toISOString().split("T")[0]}\n\n`;

	md += "## Actors\n\n";
	for (const a of lexicon.actors) {
		md += `- [${a.name}](actors/${a.id}.md) — ${a.kind} — ${a.description?.split("\n")[0] || ""}\n`;
	}

	md += "\n## Views\n\n";
	for (const v of lexicon.views) {
		md += `- [${v.name}](views/${v.id}.md) — ${v.kind}${v.route ? ` — \`${v.route}\`` : ""}\n`;
	}

	md += "\n## Journeys\n\n";
	for (const j of lexicon.journeys) {
		md += `- [${j.name}](journeys/${j.id}.md)\n`;
	}

	md += "\n## Constraints\n\n";
	for (const c of lexicon.constraints) {
		md += `- [${c.name}](constraints/${c.id}.md) — ${c.kind}\n`;
	}

	md += "\n## Generated Artifacts\n\n";
	md += "- [Glossary](generated/glossary.md)\n";
	md += "- [Traceability Matrix](generated/matrix.md)\n";
	md += "- [Dashboard](generated/dashboard.md)\n";
	md += "- [Code Inventory](generated/inventory.md)\n";

	return md;
}
