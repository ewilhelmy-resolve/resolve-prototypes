import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { extractComponents } from "../extractors/component-extractor.js";
import { extractDependencies } from "../extractors/dependency-extractor.js";
import { extractHooks } from "../extractors/hook-extractor.js";
import { extractRoutes } from "../extractors/route-extractor.js";
import { extractRouteSchemas } from "../extractors/route-schema-extractor.js";
import { extractSchemas } from "../extractors/schema-extractor.js";
import { extractSSE } from "../extractors/sse-extractor.js";
import { extractStories } from "../extractors/story-extractor.js";
import { extractTests } from "../extractors/test-extractor.js";
import { extractAll } from "../extractors/ts-extractor.js";
import type { Lexicon } from "../types/lexicon.js";
import { mergeLexicon } from "../utils/merge-lexicon.js";
import { findRepoRoot } from "../utils/repo-root.js";

interface ExtractOptions {
	output: string;
}

export async function extractCommand(options: ExtractOptions) {
	const rootDir = findRepoRoot();
	const outputPath = path.resolve(rootDir, options.output);

	console.log(chalk.blue("Extracting metadata from source code...\n"));

	const tsData = await extractAll(rootDir);
	const storyData = await extractStories(rootDir);
	const routeData = await extractRoutes(rootDir);
	const schemaData = await extractSchemas(rootDir);
	const componentData = await extractComponents(rootDir);
	const testData = await extractTests(rootDir);
	const routeSchemaData = await extractRouteSchemas(rootDir);
	const sseData = await extractSSE(rootDir);
	const hookData = await extractHooks(rootDir);
	const dependencyData = await extractDependencies(rootDir);

	const lexicon = mergeLexicon(
		tsData,
		storyData,
		routeData,
		schemaData,
		componentData,
		testData,
		routeSchemaData,
		sseData,
		hookData,
		dependencyData,
	);

	mkdirSync(path.dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, JSON.stringify(lexicon, null, "\t"), "utf-8");

	console.log(
		chalk.green(`\nLexicon written to ${path.relative(rootDir, outputPath)}`),
	);
	printStats(lexicon);
}

function printStats(lexicon: Lexicon) {
	const { stats } = lexicon;
	console.log(`\n  Files scanned:    ${stats.totalFiles}`);
	console.log(`  Exports found:    ${stats.totalExports}`);
	console.log(`  Annotated:        ${stats.annotatedExports}`);
	console.log(`  Coverage:         ${stats.coveragePercent.toFixed(1)}%`);
	console.log(`  Actors:           ${lexicon.actors.length}`);
	console.log(`  Views:            ${lexicon.views.length}`);
	console.log(`  Journeys:         ${lexicon.journeys.length}`);
	console.log(`  Constraints:      ${lexicon.constraints.length}`);
	console.log(`  API Endpoints:    ${lexicon.endpoints?.length || 0}`);
	console.log(`  SSE Events:       ${lexicon.sseEvents?.length || 0}`);
	console.log(`  React Hooks:      ${lexicon.hooks?.length || 0}`);
	console.log(`  Dependencies:     ${lexicon.dependencies?.length || 0}`);
}
