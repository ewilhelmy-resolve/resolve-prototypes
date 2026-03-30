import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Lexicon } from "../types/lexicon.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type { ComponentData } from "../extractors/component-extractor.js";
import type { RouteData } from "../extractors/route-extractor.js";
import type { SchemaData } from "../extractors/schema-extractor.js";
import type { StoryData } from "../extractors/story-extractor.js";
import type { TestData } from "../extractors/test-extractor.js";
import type { ExtractedData } from "../extractors/ts-extractor.js";
import type { Vocabulary } from "../types/vocabulary.js";

export function mergeLexicon(
	tsData: ExtractedData,
	storyData: StoryData,
	routeData: RouteData,
	schemaData: SchemaData,
	componentData: ComponentData,
	testData: TestData,
): Lexicon {
	// Start with ts-morph extracted data
	const actors = dedup(tsData.actors, (a) => a.id);
	const views = dedup(tsData.views, (v) => v.id);
	// Schema data first — has enriched Zod rule descriptions
	const constraints = dedup(
		[...schemaData.constraints, ...tsData.constraints],
		(c) => c.id,
	);
	const journeys = dedup(
		[...tsData.journeys, ...routeData.journeys, ...testData.journeys],
		(j) => j.id,
	);

	// Enrich views with storybook paths
	for (const storyView of storyData.views) {
		const existing = views.find((v) => v.id === storyView.id);
		if (existing && storyView.storybookPath) {
			existing.storybookPath = storyView.storybookPath;
		}
	}

	// Enrich views with component props
	for (const compView of componentData.views) {
		const existing = views.find((v) => v.id === compView.id);
		if (existing && compView.props && compView.props.length > 0) {
			existing.props = compView.props;
		}
	}

	// Load vocabulary
	let vocabulary: Vocabulary | undefined;
	const termsPath = path.resolve(__dirname, "../../data/terms.json");
	if (existsSync(termsPath)) {
		vocabulary = JSON.parse(readFileSync(termsPath, "utf-8"));
	}

	const totalExports = tsData.totalExports;
	const annotatedExports = tsData.annotatedExports;

	return {
		version: "1.0",
		generatedAt: new Date().toISOString(),
		packages: ["api-server", "client", "iframe-app"],
		vocabulary,
		actors,
		views,
		journeys,
		constraints,
		stats: {
			totalFiles: tsData.totalFiles,
			totalExports,
			annotatedExports,
			coveragePercent:
				totalExports > 0 ? (annotatedExports / totalExports) * 100 : 0,
		},
	};
}

function dedup<T extends { id: string }>(
	items: T[],
	getId: (item: T) => string,
): T[] {
	const map = new Map<string, T>();
	for (const item of items) {
		const id = getId(item);
		if (!map.has(id)) {
			map.set(id, item);
		}
	}
	return Array.from(map.values());
}
