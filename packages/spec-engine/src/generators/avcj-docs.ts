import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Actor, Constraint, Journey, View } from "../types/avcj.js";
import type { Lexicon } from "../types/lexicon.js";

/**
 * Generates the AVCJ specification docs.
 *
 * AVCJ definitions (per CTO guidance):
 * - Actors = users (Admin, Standard User), not code entities
 * - Views = pages/screens, not individual components
 * - Journeys = product-defined workflows, not auto-generated route shells
 * - Constraints = rules applied to actors for views
 *
 * Code entities (services, hooks, components) go to "engineering/" section.
 */
export async function generateAvcjDocs(
	lexicon: Lexicon,
	outputDir: string,
) {
	const dirs = [
		"actors",
		"views",
		"journeys",
		"constraints",
		"engineering",
	];
	for (const dir of dirs) {
		mkdirSync(path.join(outputDir, dir), { recursive: true });
	}

	// --- Actors: hard-coded users ---
	const userActors = getSystemActors();
	for (const actor of userActors) {
		writeFileSync(
			path.join(outputDir, "actors", `${actor.id}.md`),
			renderUserActor(actor),
		);
	}
	console.log(
		chalk.green(`  Generated: ${userActors.length} actor docs (users)`),
	);

	// --- Views: pages only (kind === "page") ---
	const pageViews = lexicon.views.filter((v) => v.kind === "page");
	for (const view of pageViews) {
		writeFileSync(
			path.join(outputDir, "views", `${view.id}.md`),
			renderView(view),
		);
	}
	console.log(
		chalk.green(`  Generated: ${pageViews.length} view docs (pages)`),
	);

	// --- Journeys: only hand-written or substantial ones ---
	// Keep journeys that have >2 steps with descriptions (test-documented with real content)
	// Also keep any journey from packages/client/docs/journeys/ (hand-written)
	const substantialJourneys = lexicon.journeys.filter(
		(j) =>
			j.steps.length > 2 &&
			j.steps.some((s) => s.description && s.description.length > 10),
	);
	for (const journey of substantialJourneys) {
		writeFileSync(
			path.join(outputDir, "journeys", `${journey.id}.md`),
			renderJourney(journey),
		);
	}
	// Also copy hand-written journey files from packages/client/docs/journeys/
	const handWrittenDir = path.join(
		outputDir,
		"../../packages/client/docs/journeys",
	);
	if (existsSync(handWrittenDir)) {
		const { readdirSync } = await import("node:fs");
		for (const file of readdirSync(handWrittenDir)) {
			if (file.endsWith(".md")) {
				const content = readFileSync(
					path.join(handWrittenDir, file),
					"utf-8",
				);
				writeFileSync(path.join(outputDir, "journeys", file), content);
			}
		}
	}
	console.log(
		chalk.green(
			`  Generated: ${substantialJourneys.length} journey docs (substantial)`,
		),
	);

	// --- Constraints: keep all ---
	for (const constraint of lexicon.constraints) {
		writeFileSync(
			path.join(outputDir, "constraints", `${constraint.id}.md`),
			renderConstraint(constraint),
		);
	}
	console.log(
		chalk.green(
			`  Generated: ${lexicon.constraints.length} constraint docs`,
		),
	);

	// --- Engineering: code entities (services, hooks, components) ---
	for (const actor of lexicon.actors) {
		writeFileSync(
			path.join(outputDir, "engineering", `${actor.id}.md`),
			renderCodeEntity(actor),
		);
	}
	// Components (non-page views)
	const componentViews = lexicon.views.filter((v) => v.kind !== "page");
	for (const view of componentViews) {
		writeFileSync(
			path.join(outputDir, "engineering", `${view.id}.md`),
			renderView(view),
		);
	}
	console.log(
		chalk.green(
			`  Generated: ${lexicon.actors.length + componentViews.length} engineering docs`,
		),
	);

	// Generate README TOC
	writeFileSync(
		path.join(outputDir, "README.md"),
		renderReadme(lexicon, userActors, pageViews, substantialJourneys),
	);
	console.log(chalk.green("  Generated: README.md"));
}

// --- System actors (users) ---

interface UserActor {
	id: string;
	name: string;
	role: string;
	description: string;
	permissions: string[];
}

function getSystemActors(): UserActor[] {
	return [
		{
			id: "admin",
			name: "Admin",
			role: "owner | admin",
			description:
				"Organization administrator with full access to settings, member management, data source configuration, and all features.",
			permissions: [
				"Manage organization settings",
				"Invite and remove members",
				"Configure data source connections",
				"Access credential delegation",
				"View all conversations and files",
				"Manage feature flags",
				"Access developer tools",
			],
		},
		{
			id: "standard-user",
			name: "Standard User",
			role: "user",
			description:
				"Regular organization member with access to chat, files, and their own conversations. Cannot manage settings or other members.",
			permissions: [
				"Create and view own conversations",
				"Upload and manage files",
				"View knowledge base articles",
				"Use chat features",
			],
		},
	];
}

function renderUserActor(actor: UserActor): string {
	const frontmatter = [
		"---",
		"type: actor",
		`id: ${actor.id}`,
		`name: ${actor.name}`,
		`role: ${actor.role}`,
		"---",
	].join("\n");

	let body = `\n\n# ${actor.name}\n\n${actor.description}\n`;

	body += "\n## Permissions\n\n";
	for (const p of actor.permissions) {
		body += `- ${p}\n`;
	}

	return frontmatter + body;
}

// --- Renderers ---

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
			if (step.description) {
				body += `\n   > ${step.description}`;
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

function renderCodeEntity(actor: Actor): string {
	const frontmatter = [
		"---",
		"type: engineering",
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

function renderReadme(
	lexicon: Lexicon,
	userActors: UserActor[],
	pageViews: View[],
	journeys: Journey[],
): string {
	let md = "# Rita Living Specification\n\n";
	md += `> Auto-generated on ${new Date().toISOString().split("T")[0]}\n\n`;

	md += "## Actors\n\n";
	md += "*Users who interact with the application.*\n\n";
	for (const a of userActors) {
		md += `- [${a.name}](actors/${a.id}.md) — ${a.role} — ${a.description.split(".")[0]}\n`;
	}

	md += "\n## Views\n\n";
	md += "*Pages and screens in the application.*\n\n";
	for (const v of pageViews) {
		md += `- [${v.name}](views/${v.id}.md)${v.route ? ` — \`${v.route}\`` : ""}\n`;
	}

	md += "\n## Journeys\n\n";
	md += "*User workflows defined by product. Empty journeys are waiting for product definition.*\n\n";
	if (journeys.length === 0) {
		md += "*No journeys defined yet. Product team will define these.*\n";
	}
	for (const j of journeys) {
		md += `- [${j.name}](journeys/${j.id}.md) — ${j.steps.length} steps\n`;
	}

	md += "\n## Constraints\n\n";
	md += "*Rules applied to actors for views (authorization, validation).*\n\n";
	for (const c of lexicon.constraints) {
		md += `- [${c.name}](constraints/${c.id}.md) — ${c.kind}\n`;
	}

	md += "\n## Engineering Reference\n\n";
	md += "*Code entities — services, hooks, components. Auto-generated from source.*\n\n";
	md += `- [API Reference](generated/api-reference.md) — ${lexicon.endpoints?.length || 0} endpoints\n`;
	md += "- [Dashboard](generated/dashboard.md) — coverage stats\n";
	md += "- [Glossary](generated/glossary.md) — term index\n";
	md += "- [Code Inventory](generated/inventory.md) — full listing\n";
	md += "- [Traceability Matrix](generated/matrix.md)\n";
	md += `- [Engineering Entities](engineering/) — ${lexicon.actors.length} services/hooks + ${lexicon.views.filter((v) => v.kind !== "page").length} components\n`;

	return md;
}
