/**
 * Generate OpenAPI JSON from registered schemas
 * Run: pnpm docs:generate
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Import routes to register their OpenAPI docs
import "../src/routes/auth.js";
import "../src/routes/clusters.js";
import "../src/routes/conversations.js";
import "../src/routes/credentialDelegations.js";
import "../src/routes/dataSources.js";
import "../src/routes/featureFlags.js";
import "../src/routes/files.js";
import "../src/routes/iframe.routes.js";
import "../src/routes/invitations.js";
import "../src/routes/members.js";
import "../src/routes/mlModels.js";
import "../src/routes/organizations.js";
import "../src/routes/sse.js";
import "../src/routes/tickets.js";
import "../src/routes/workflows.js";
import "../src/schemas/health.js"; // Health endpoint (defined in index.ts)

import { generateOpenAPIDocument } from "../src/docs/openapi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const spec = generateOpenAPIDocument();
const outputPath = join(__dirname, "..", "openapi.json");

writeFileSync(outputPath, JSON.stringify(spec, null, "\t"));

console.log(`OpenAPI spec generated at: ${outputPath}`);
console.log(`Paths documented: ${Object.keys(spec.paths || {}).length}`);
console.log(
	`Schemas defined: ${Object.keys(spec.components?.schemas || {}).length}`,
);

process.exit(0);
