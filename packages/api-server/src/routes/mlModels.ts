import { Router } from "express";
import { registry } from "../docs/openapi.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import { ActiveModelResponseSchema } from "../schemas/mlModel.js";
import { MlModelService } from "../services/MlModelService.js";
import type { AuthenticatedRequest } from "../types/express.js";
import type { ActiveModelResponse } from "../types/mlModel.js";

const router = Router();
const mlModelService = new MlModelService();

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/ml-models/active",
	tags: ["ML Models"],
	summary: "Get active ML model",
	description:
		"Returns the currently active ML model for the user's organization",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	responses: {
		200: {
			description: "Active model or null if none active",
			content: { "application/json": { schema: ActiveModelResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

/**
 * GET /api/ml-models/active
 * Returns the active ML model for the user's organization
 */
router.get("/active", async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		const model = await mlModelService.getActiveModel(
			authReq.user.activeOrganizationId,
		);

		const response: ActiveModelResponse = { data: model };
		res.json(response);
	} catch (error) {
		req.log?.error({ error }, "Failed to fetch active model");
		res.status(500).json({ error: "Failed to fetch active model" });
	}
});

export default router;
