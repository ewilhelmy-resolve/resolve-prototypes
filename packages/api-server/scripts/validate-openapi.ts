/**
 * Validate OpenAPI spec
 * Run: pnpm docs:validate
 */

import SwaggerParser from "@apidevtools/swagger-parser";

// Import route docs to register all paths
import "../src/docs/routes/clusters.docs.js";
import "../src/docs/routes/conversations.docs.js";
import "../src/docs/routes/dataSources.docs.js";

import { generateOpenAPIDocument } from "../src/docs/openapi.js";

async function validate() {
	console.log("Generating OpenAPI spec...");
	const spec = generateOpenAPIDocument();

	console.log(`Paths documented: ${Object.keys(spec.paths || {}).length}`);
	console.log(
		`Schemas defined: ${Object.keys(spec.components?.schemas || {}).length}`,
	);

	console.log("\nValidating OpenAPI spec...");

	try {
		// Validate the spec
		await SwaggerParser.validate(spec as any);
		console.log("\n✅ OpenAPI spec is valid!");
		process.exit(0);
	} catch (err) {
		console.error("\n❌ OpenAPI validation failed:");
		console.error(err);
		process.exit(1);
	}
}

validate();
