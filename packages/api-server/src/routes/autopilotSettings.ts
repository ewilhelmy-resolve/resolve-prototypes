import express from "express";
import { db } from "../config/kysely.js";
import { registry } from "../docs/openapi.js";
import { requireRole } from "../middleware/auth.js";
import {
	AutopilotSettingsResponseSchema,
	UpdateAutopilotSettingsSchema,
} from "../schemas/autopilotSettings.js";
import {
	ErrorResponseSchema,
	ValidationErrorSchema,
} from "../schemas/common.js";
import { AutopilotSettingsService } from "../services/AutopilotSettingsService.js";
import type { AuthenticatedRequest } from "../types/express.js";

const router = express.Router();
const service = new AutopilotSettingsService();

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/autopilot-settings",
	tags: ["Autopilot Settings"],
	summary: "Get autopilot settings",
	description:
		"Get autopilot settings for the active organization. Creates with defaults if not yet configured.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	responses: {
		200: {
			description: "Autopilot settings",
			content: {
				"application/json": { schema: AutopilotSettingsResponseSchema },
			},
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

registry.registerPath({
	method: "patch",
	path: "/api/autopilot-settings",
	tags: ["Autopilot Settings"],
	summary: "Update autopilot settings",
	description:
		"Update autopilot settings for the active organization. Requires admin or owner role.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: {
				"application/json": { schema: UpdateAutopilotSettingsSchema },
			},
		},
	},
	responses: {
		200: {
			description: "Updated autopilot settings",
			content: {
				"application/json": { schema: AutopilotSettingsResponseSchema },
			},
		},
		400: {
			description: "Validation error",
			content: { "application/json": { schema: ValidationErrorSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires admin or owner role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/autopilot-settings
 * Get autopilot settings for active org (lazy-creates with defaults)
 */
router.get("/", async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		const settings = await service.getOrCreate(
			authReq.user.activeOrganizationId,
		);

		res.json({ data: settings });
	} catch (error) {
		console.error("[AutopilotSettings] Error fetching settings:", error);
		res.status(500).json({ error: "Failed to fetch autopilot settings" });
	}
});

/**
 * PATCH /api/autopilot-settings
 * Update autopilot settings (admin/owner only, audit logged)
 */
router.patch("/", requireRole(["owner", "admin"]), async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		const validation = UpdateAutopilotSettingsSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				error: "Validation error",
				details: validation.error.issues,
			});
		}

		const orgId = authReq.user.activeOrganizationId;
		const userId = authReq.user.id;

		// Get current settings for audit metadata
		const before = await service.getOrCreate(orgId);

		const updated = await service.update(orgId, validation.data, userId);

		// Audit log
		await db
			.insertInto("audit_logs")
			.values({
				organization_id: orgId,
				user_id: userId,
				action: "update_autopilot_settings",
				resource_type: "autopilot_settings",
				resource_id: updated.id,
				metadata: JSON.stringify({
					before: {
						cost_per_ticket: before.cost_per_ticket,
						avg_time_per_ticket_minutes: before.avg_time_per_ticket_minutes,
					},
					after: {
						cost_per_ticket: updated.cost_per_ticket,
						avg_time_per_ticket_minutes: updated.avg_time_per_ticket_minutes,
					},
				}),
			})
			.execute();

		res.json({ data: updated });
	} catch (error) {
		console.error("[AutopilotSettings] Error updating settings:", error);
		res.status(500).json({ error: "Failed to update autopilot settings" });
	}
});

export default router;
