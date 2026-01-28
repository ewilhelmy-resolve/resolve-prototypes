/**
 * Feature Flag Relay Proxy Routes
 *
 * Proxies feature flag requests to platform API via FeatureFlagService.
 * Environment is determined by NODE_ENV on the server.
 */

import express from "express";
import { registry, z } from "../docs/openapi.js";
import { requireRole } from "../middleware/auth.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import {
	BatchFlagsRequestSchema,
	BatchFlagsResponseSchema,
	FlagCheckResponseSchema,
	UpdateFlagRuleRequestSchema,
	UpdateFlagRuleResponseSchema,
} from "../schemas/featureFlag.js";
import {
	getFeatureFlagService,
	getPlatformFlagName,
} from "../services/FeatureFlagService.js";
import type { AuthenticatedRequest } from "../types/express.js";

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/feature-flags/{flagName}",
	tags: ["Feature Flags"],
	summary: "Check feature flag",
	description: "Check if a feature flag is enabled for the current tenant.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			flagName: z.string().openapi({ description: "Feature flag name" }),
		}),
	},
	responses: {
		200: {
			description: "Flag status",
			content: { "application/json": { schema: FlagCheckResponseSchema } },
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
	method: "post",
	path: "/api/feature-flags/batch",
	tags: ["Feature Flags"],
	summary: "Check multiple flags",
	description: "Check multiple feature flags in one request.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: BatchFlagsRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Batch flag status",
			content: { "application/json": { schema: BatchFlagsResponseSchema } },
		},
		400: {
			description: "Invalid input",
			content: { "application/json": { schema: ErrorResponseSchema } },
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
	method: "post",
	path: "/api/feature-flags/{flagName}/rules",
	tags: ["Feature Flags"],
	summary: "Update flag rule",
	description:
		"Update a feature flag rule for the organization. Requires admin or owner role.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			flagName: z.string().openapi({ description: "Feature flag name" }),
		}),
		body: {
			content: { "application/json": { schema: UpdateFlagRuleRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Flag rule updated",
			content: { "application/json": { schema: UpdateFlagRuleResponseSchema } },
		},
		400: {
			description: "Invalid input",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires admin/owner role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

const router = express.Router();

/**
 * GET /:flagName
 * Check if a feature flag is enabled for current tenant
 */
router.get("/:flagName", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { flagName } = req.params;
	const tenantId = authReq.user.activeOrganizationId;
	const platformFlagName = getPlatformFlagName(flagName);

	try {
		const service = getFeatureFlagService();
		const isEnabled = await service.isEnabled(platformFlagName, tenantId);

		res.json({ flagName, isEnabled });
	} catch (error) {
		console.error("Feature flag check error:", error);
		res.status(500).json({ error: "Failed to check feature flag" });
	}
});

/**
 * POST /batch
 * Check multiple flags in one request
 */
router.post("/batch", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { flagNames } = req.body;
	const tenantId = authReq.user.activeOrganizationId;

	if (!Array.isArray(flagNames) || flagNames.length === 0) {
		return res.status(400).json({ error: "flagNames array required" });
	}

	// Map client flag names to platform names
	const platformFlagNames = flagNames.map(getPlatformFlagName);

	try {
		const service = getFeatureFlagService();
		const platformFlags = await service.getFlags(platformFlagNames, tenantId);

		// Map back to client flag names
		const flags: Record<string, boolean> = {};
		flagNames.forEach((clientName: string, idx: number) => {
			const platformName = platformFlagNames[idx];
			flags[clientName] = platformFlags[platformName] ?? false;
		});

		res.json({ flags });
	} catch (error) {
		console.error("Batch feature flag check error:", error);
		res.status(500).json({ error: "Failed to check feature flags" });
	}
});

/**
 * POST /:flagName/rules
 * Update a feature flag rule (admin/owner only)
 */
router.post(
	"/:flagName/rules",
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		const { flagName } = req.params;
		const { isEnabled } = req.body;
		const organizationId = authReq.user.activeOrganizationId;

		if (typeof isEnabled !== "boolean") {
			return res.status(400).json({ error: "isEnabled boolean required" });
		}

		const platformFlagName = getPlatformFlagName(flagName);

		try {
			const service = getFeatureFlagService();
			const success = await service.updateRule(
				platformFlagName,
				isEnabled,
				organizationId,
			);

			if (success) {
				res.json({ success: true, flagName, isEnabled });
			} else {
				res.status(500).json({ error: "Failed to update feature flag" });
			}
		} catch (error) {
			console.error("Feature flag update error:", error);
			res.status(500).json({ error: "Failed to update feature flag" });
		}
	},
);

export default router;
