import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { generateOpenAPIDocument } from "../docs/openapi.js";

// Import route docs to register paths
import "../docs/routes/clusters.docs.js";
import "../docs/routes/conversations.docs.js";
import "../docs/routes/dataSources.docs.js";

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

// Generate spec once and cache (regenerate on server restart)
let cachedSpec: ReturnType<typeof generateOpenAPIDocument> | null = null;

function getSpec() {
	if (!cachedSpec) {
		cachedSpec = generateOpenAPIDocument();
	}
	return cachedSpec;
}

// Swagger UI
router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(getSpec(), swaggerOptions));

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
