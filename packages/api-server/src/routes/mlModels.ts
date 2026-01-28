import { Router } from "express";
import { MlModelService } from "../services/MlModelService.js";
import type { AuthenticatedRequest } from "../types/express.js";
import type { ActiveModelResponse } from "../types/mlModel.js";

const router = Router();
const mlModelService = new MlModelService();

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
