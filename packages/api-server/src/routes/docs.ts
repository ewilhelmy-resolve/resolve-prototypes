import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenAPIDocument } from "../docs/openapi.js";

// Import schemas that register OpenAPI paths (not imported via routes)
import "../schemas/health.js";

// Routes self-register their docs when imported
// (imported via index.ts/main app)

const router = Router();

// Swagger UI options
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
	customCss: ".swagger-ui .topbar { display: none }",
	customSiteTitle: "Rita API Documentation",
	swaggerOptions: {
		persistAuthorization: true,
		displayRequestDuration: true,
		filter: true,
		showExtensions: true,
	},
};

// Generate spec lazily on first request (after all routes are imported)
let cachedSpec: ReturnType<typeof generateOpenAPIDocument> | null = null;

function getSpec() {
	if (!cachedSpec) {
		cachedSpec = generateOpenAPIDocument();
	}
	return cachedSpec;
}

// Swagger UI - use lazy setup to ensure all routes are registered first
router.use("/", swaggerUi.serve);
router.get("/", (req, res, next) => {
	// Generate spec on first request, not at import time
	swaggerUi.setup(getSpec(), swaggerOptions)(req, res, next);
});

// JSON endpoint for tooling/CI
router.get("/openapi.json", (_req, res) => {
	res.json(getSpec());
});

// YAML endpoint (optional)
router.get("/openapi.yaml", (_req, res) => {
	res.setHeader("Content-Type", "text/yaml");
	res.send(
		`# Generated OpenAPI spec - use /api-docs/openapi.json for programmatic access\n# Visit /api-docs for interactive documentation`,
	);
});

export default router;
