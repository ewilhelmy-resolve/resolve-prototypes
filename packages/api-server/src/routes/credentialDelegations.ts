import express from "express";
import { pool } from "../config/database.js";
import { logger } from "../config/logger.js";
import { registry, z } from "../docs/openapi.js";
import { authenticateUser, requireRole } from "../middleware/auth.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import {
	CancelDelegationResponseSchema,
	CreateDelegationRequestSchema,
	CreateDelegationResponseSchema,
	DelegationListQuerySchema,
	DelegationListResponseSchema,
	DelegationStatusResponseSchema,
	SubmitCredentialsRequestSchema,
	SubmitCredentialsResponseSchema,
	VerifyDelegationResponseSchema,
} from "../schemas/credentialDelegation.js";
import { CredentialDelegationService } from "../services/CredentialDelegationService.js";
import { DataSourceWebhookService } from "../services/DataSourceWebhookService.js";
import { WebhookService } from "../services/WebhookService.js";
import type {
	CreateDelegationRequest,
	ListDelegationsQuery,
	SubmitCredentialsRequest,
} from "../types/credentialDelegation.js";
import type { AuthenticatedRequest } from "../types/express.js";

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/credential-delegations/create",
	tags: ["Credential Delegations"],
	summary: "Create credential delegation",
	description:
		"Create a new credential delegation and send email to IT admin. Rate limited to 10 per org per day.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: {
				"application/json": { schema: CreateDelegationRequestSchema },
			},
		},
	},
	responses: {
		201: {
			description: "Delegation created and email sent",
			content: {
				"application/json": { schema: CreateDelegationResponseSchema },
			},
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
			description: "Forbidden - requires owner/admin role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		409: {
			description: "Delegation already exists for this admin",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		429: {
			description: "Rate limit exceeded (10/day)",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/credential-delegations/verify/{token}",
	tags: ["Credential Delegations"],
	summary: "Verify delegation token",
	description:
		"Verify a delegation token and return details. Public endpoint - token is the auth.",
	security: [],
	request: {
		params: z.object({
			token: z.string().length(64).openapi({ description: "Delegation token" }),
		}),
	},
	responses: {
		200: {
			description: "Token verification result",
			content: {
				"application/json": { schema: VerifyDelegationResponseSchema },
			},
		},
		400: {
			description: "Invalid token format",
			content: {
				"application/json": { schema: VerifyDelegationResponseSchema },
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": { schema: VerifyDelegationResponseSchema },
			},
		},
	},
});

registry.registerPath({
	method: "post",
	path: "/api/credential-delegations/submit",
	tags: ["Credential Delegations"],
	summary: "Submit ITSM credentials",
	description:
		"Submit ITSM credentials via delegation token. Public endpoint - token is the auth.",
	security: [],
	request: {
		body: {
			content: {
				"application/json": { schema: SubmitCredentialsRequestSchema },
			},
		},
	},
	responses: {
		200: {
			description: "Credentials submitted",
			content: {
				"application/json": { schema: SubmitCredentialsResponseSchema },
			},
		},
		400: {
			description: "Invalid input or credentials",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		409: {
			description: "Token already used",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		410: {
			description: "Token expired",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/credential-delegations/status/{token}",
	tags: ["Credential Delegations"],
	summary: "Get delegation status",
	description: "Get delegation status by token. Public endpoint for polling.",
	security: [],
	request: {
		params: z.object({
			token: z.string().length(64).openapi({ description: "Delegation token" }),
		}),
	},
	responses: {
		200: {
			description: "Delegation status",
			content: {
				"application/json": { schema: DelegationStatusResponseSchema },
			},
		},
		400: {
			description: "Invalid token",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Token not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/credential-delegations",
	tags: ["Credential Delegations"],
	summary: "List delegations",
	description: "List credential delegations for the organization.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		query: DelegationListQuerySchema,
	},
	responses: {
		200: {
			description: "Delegation list",
			content: { "application/json": { schema: DelegationListResponseSchema } },
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
	method: "delete",
	path: "/api/credential-delegations/{id}/cancel",
	tags: ["Credential Delegations"],
	summary: "Cancel delegation",
	description: "Cancel a pending credential delegation.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Delegation ID" }),
		}),
	},
	responses: {
		200: {
			description: "Delegation cancelled",
			content: {
				"application/json": { schema: CancelDelegationResponseSchema },
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires owner/admin role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Delegation not found or cannot be cancelled",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

const router = express.Router();
const webhookService = new WebhookService();
const dataSourceWebhookService = new DataSourceWebhookService();
const credentialDelegationService = new CredentialDelegationService(
	pool,
	webhookService,
	dataSourceWebhookService,
);

/**
 * POST /api/credential-delegations/create
 * Create a new credential delegation and send email to IT admin
 * Auth: Required (owner/admin)
 * Rate Limit: 10 delegations per org per day (enforced in service)
 */
router.post(
	"/create",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const { admin_email, itsm_system_type } =
				req.body as CreateDelegationRequest;
			const userId = authReq.user.id;
			const organizationId = authReq.user.activeOrganizationId;

			// Validate input
			if (!admin_email || typeof admin_email !== "string") {
				return res.status(400).json({ error: "admin_email is required" });
			}

			if (
				!itsm_system_type ||
				!["servicenow_itsm", "jira_itsm"].includes(itsm_system_type)
			) {
				return res.status(400).json({
					error:
						"itsm_system_type is required and must be one of: servicenow_itsm, jira_itsm",
				});
			}

			const result = await credentialDelegationService.createDelegation(
				organizationId,
				userId,
				admin_email,
				itsm_system_type,
			);

			logger.info(
				{
					organizationId,
					userId,
					adminEmail: admin_email,
					itsmSystemType: itsm_system_type,
					delegationId: result.delegation_id,
				},
				"Credential delegation created",
			);

			res.status(201).json(result);
		} catch (error) {
			logger.error({ error }, "Failed to create credential delegation");

			if (error instanceof Error) {
				if (error.message.includes("Rate limit")) {
					return res.status(429).json({ error: error.message });
				}
				if (error.message.includes("already exists")) {
					return res.status(409).json({ error: error.message });
				}
				if (error.message.includes("Invalid")) {
					return res.status(400).json({ error: error.message });
				}
			}

			res.status(500).json({ error: "Failed to create credential delegation" });
		}
	},
);

/**
 * GET /api/credential-delegations/verify/:token
 * Verify delegation token and return details (public endpoint)
 * Auth: Not required (token is the auth)
 */
router.get("/verify/:token", async (req, res) => {
	try {
		const { token } = req.params;

		if (!token || token.length !== 64) {
			return res.status(400).json({ valid: false, reason: "not_found" });
		}

		const result = await credentialDelegationService.verifyToken(token);
		res.json(result);
	} catch (error) {
		logger.error({ error }, "Failed to verify delegation token");
		res.status(500).json({ valid: false, reason: "not_found" });
	}
});

/**
 * POST /api/credential-delegations/submit
 * Submit ITSM credentials via delegation token (public endpoint)
 * Auth: Not required (token is the auth)
 */
router.post("/submit", async (req, res) => {
	try {
		const { token, credentials } = req.body as SubmitCredentialsRequest;

		if (!token || typeof token !== "string") {
			return res.status(400).json({ error: "Token is required" });
		}

		if (!credentials || typeof credentials !== "object") {
			return res.status(400).json({ error: "Credentials are required" });
		}

		const result = await credentialDelegationService.submitCredentials(
			token,
			credentials,
		);

		logger.info(
			{ delegationId: result.delegation_id },
			"Credentials submitted via delegation",
		);

		res.json(result);
	} catch (error) {
		logger.error({ error }, "Failed to submit credentials");

		if (error instanceof Error) {
			if (
				error.message.includes("Invalid") ||
				error.message.includes("required")
			) {
				return res.status(400).json({ error: error.message });
			}
			if (error.message.includes("expired")) {
				return res.status(410).json({ error: error.message });
			}
			if (error.message.includes("already been used")) {
				return res.status(409).json({ error: error.message });
			}
		}

		res.status(500).json({ error: "Failed to submit credentials" });
	}
});

/**
 * GET /api/credential-delegations/status/:token
 * Get delegation status by token (public endpoint for polling)
 * Auth: Not required (token is the auth)
 */
router.get("/status/:token", async (req, res) => {
	try {
		const { token } = req.params;

		if (!token || token.length !== 64) {
			return res.status(400).json({ error: "Invalid token" });
		}

		const result = await credentialDelegationService.getStatus(token);
		res.json(result);
	} catch (error) {
		logger.error({ error }, "Failed to get delegation status");

		if (error instanceof Error) {
			if (error.message.includes("not found")) {
				return res.status(404).json({ error: "Token not found" });
			}
			if (error.message.includes("Invalid")) {
				return res.status(400).json({ error: error.message });
			}
		}

		res.status(500).json({ error: "Failed to get delegation status" });
	}
});

/**
 * GET /api/credential-delegations
 * List delegations for organization
 * Auth: Required (member or higher)
 */
router.get("/", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const organizationId = authReq.user.activeOrganizationId;

		const query: ListDelegationsQuery = {
			status: req.query.status as any,
			system_type: req.query.system_type as any,
			limit: req.query.limit ? Number(req.query.limit) : undefined,
			offset: req.query.offset ? Number(req.query.offset) : undefined,
		};

		const delegations = await credentialDelegationService.listDelegations(
			organizationId,
			query,
		);

		res.json({ delegations });
	} catch (error) {
		logger.error({ error }, "Failed to list delegations");
		res.status(500).json({ error: "Failed to list delegations" });
	}
});

/**
 * DELETE /api/credential-delegations/:id/cancel
 * Cancel a pending delegation
 * Auth: Required (owner/admin)
 */
router.delete(
	"/:id/cancel",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const { id } = req.params;
			const organizationId = authReq.user.activeOrganizationId;
			const userId = authReq.user.id;

			const result = await credentialDelegationService.cancelDelegation(
				id,
				organizationId,
				userId,
			);

			logger.info(
				{ delegationId: id, organizationId, userId },
				"Delegation cancelled",
			);

			res.json(result);
		} catch (error) {
			logger.error({ error }, "Failed to cancel delegation");

			if (error instanceof Error && error.message.includes("not found")) {
				return res
					.status(404)
					.json({ error: "Delegation not found or cannot be cancelled" });
			}

			res.status(500).json({ error: "Failed to cancel delegation" });
		}
	},
);

export default router;
