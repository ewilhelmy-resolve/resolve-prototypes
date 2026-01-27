/**
 * Generate OpenAPI JSON from registered schemas
 * Run: pnpm docs:generate
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Import route docs to register all paths
import "../src/docs/routes/clusters.docs.js";
import "../src/docs/routes/conversations.docs.js";
import "../src/docs/routes/dataSources.docs.js";

import { generateOpenAPIDocument } from "../src/docs/openapi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const spec = generateOpenAPIDocument();
const outputPath = join(__dirname, "..", "openapi.json");

writeFileSync(outputPath, JSON.stringify(spec, null, 2));

console.log(`OpenAPI spec generated at: ${outputPath}`);
console.log(`Paths documented: ${Object.keys(spec.paths || {}).length}`);
console.log(
	`Schemas defined: ${Object.keys(spec.components?.schemas || {}).length}`,
);
