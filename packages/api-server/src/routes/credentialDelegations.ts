import express from "express";
import { pool } from "../config/database.js";
import { logger } from "../config/logger.js";
import { authenticateUser, requireRole } from "../middleware/auth.js";
import { CredentialDelegationService } from "../services/CredentialDelegationService.js";
import { DataSourceWebhookService } from "../services/DataSourceWebhookService.js";
import { WebhookService } from "../services/WebhookService.js";
import type {
	CreateDelegationRequest,
	ListDelegationsQuery,
	SubmitCredentialsRequest,
} from "../types/credentialDelegation.js";
import type { AuthenticatedRequest } from "../types/express.js";

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
						"itsm_system_type is required and must be one of: servicenow_itsm, jira",
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
