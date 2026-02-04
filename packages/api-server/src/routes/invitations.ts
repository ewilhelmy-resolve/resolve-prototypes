import express from "express";
import { pool } from "../config/database.js";
import { logger } from "../config/logger.js";
import { registry, z } from "../docs/openapi.js";
import { authenticateUser, requireRole } from "../middleware/auth.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import {
	AcceptInvitationRequestSchema,
	AcceptInvitationResponseSchema,
	CancelInvitationResponseSchema,
	InvitationListQuerySchema,
	InvitationListResponseSchema,
	SendInvitationsRequestSchema,
	SendInvitationsResponseSchema,
	VerifyInvitationResponseSchema,
} from "../schemas/invitation.js";
import { InvitationService } from "../services/InvitationService.js";
import { WebhookService } from "../services/WebhookService.js";
import type { AuthenticatedRequest } from "../types/express.js";
import type { SendInvitationsRequest } from "../types/invitation.js";

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/invitations/send",
	tags: ["Invitations"],
	summary: "Send invitations",
	description:
		"Send invitations to multiple email addresses. Rate limited to 50 per org per hour.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: SendInvitationsRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Invitations sent (partial success possible)",
			content: {
				"application/json": { schema: SendInvitationsResponseSchema },
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
		429: {
			description: "Rate limit exceeded (50/hour)",
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
	path: "/api/invitations/verify/{token}",
	tags: ["Invitations"],
	summary: "Verify invitation token",
	description:
		"Verify an invitation token and return invitation details. Public endpoint.",
	security: [],
	request: {
		params: z.object({
			token: z.string().length(64).openapi({ description: "Invitation token" }),
		}),
	},
	responses: {
		200: {
			description: "Token verification result",
			content: {
				"application/json": { schema: VerifyInvitationResponseSchema },
			},
		},
		400: {
			description: "Invalid token format",
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
	path: "/api/invitations/accept",
	tags: ["Invitations"],
	summary: "Accept invitation",
	description:
		"Accept invitation and create account. Public endpoint. Rate limited to 5 attempts per token per hour.",
	security: [],
	request: {
		body: {
			content: {
				"application/json": { schema: AcceptInvitationRequestSchema },
			},
		},
	},
	responses: {
		200: {
			description: "Account created",
			content: {
				"application/json": { schema: AcceptInvitationResponseSchema },
			},
		},
		400: {
			description:
				"Invalid input, already accepted, expired, or account exists",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		429: {
			description: "Too many attempts",
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
	path: "/api/invitations",
	tags: ["Invitations"],
	summary: "List invitations",
	description:
		"List invitations for the organization with optional status filter.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		query: InvitationListQuerySchema,
	},
	responses: {
		200: {
			description: "Invitation list",
			content: { "application/json": { schema: InvitationListResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires owner/admin role",
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
	path: "/api/invitations/{id}/cancel",
	tags: ["Invitations"],
	summary: "Cancel invitation",
	description: "Cancel a pending invitation.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Invitation ID" }),
		}),
	},
	responses: {
		200: {
			description: "Invitation cancelled",
			content: {
				"application/json": { schema: CancelInvitationResponseSchema },
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
			description: "Invitation not found or cannot be cancelled",
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
// Note: pool is still needed for InvitationService instantiation
const invitationService = new InvitationService(pool, webhookService);

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): boolean {
	const now = Date.now();
	const limit = rateLimiter.get(key);

	if (!limit || now > limit.resetAt) {
		rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}

	if (limit.count >= maxRequests) {
		return false;
	}

	limit.count++;
	return true;
}

/**
 * POST /api/invitations/send
 * Send invitations to multiple emails
 * Auth: Required (owner/admin)
 * Rate Limit: 50 invitations per org per hour
 */
router.post(
	"/send",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const { emails } = req.body as SendInvitationsRequest;
			const userId = authReq.user.id;
			const organizationId = authReq.user.activeOrganizationId;

			// Validate input
			if (!emails || !Array.isArray(emails) || emails.length === 0) {
				return res.status(400).json({ error: "Emails array is required" });
			}

			if (emails.length > 50) {
				return res
					.status(400)
					.json({ error: "Maximum 50 invitations per request" });
			}

			// Rate limiting (50 per org per hour)
			const rateLimitKey = `invitations:${organizationId}`;
			if (!checkRateLimit(rateLimitKey, 50, 60 * 60 * 1000)) {
				return res.status(429).json({
					error: "Rate limit exceeded. Maximum 50 invitations per hour.",
				});
			}

			const result = await invitationService.sendInvitations(
				organizationId,
				userId,
				emails,
			);

			logger.info(
				{
					organizationId,
					userId,
					successCount: result.successCount,
					failureCount: result.failureCount,
				},
				"Invitations sent",
			);

			res.json(result);
		} catch (error) {
			logger.error({ error }, "Failed to send invitations");
			res.status(500).json({ error: "Failed to send invitations" });
		}
	},
);

/**
 * GET /api/invitations/verify/:token
 * Verify invitation token and return details
 * Auth: Not required (public)
 */
router.get("/verify/:token", async (req, res) => {
	try {
		const { token } = req.params;

		if (!token || token.length !== 64) {
			return res.status(400).json({ error: "Invalid token format" });
		}

		const result = await invitationService.verifyToken(token);
		res.json(result);
	} catch (error) {
		logger.error({ error }, "Failed to verify invitation");
		res.status(500).json({ error: "Failed to verify invitation" });
	}
});

/**
 * POST /api/invitations/accept
 * Accept invitation and create account
 * Auth: Not required (public)
 * Rate Limit: 5 attempts per token per hour
 */
router.post("/accept", async (req, res) => {
	try {
		const { token, firstName, lastName, password } = req.body;

		// Validate input
		if (!token || !firstName || !lastName || !password) {
			return res.status(400).json({ error: "All fields are required" });
		}

		// Rate limiting (5 attempts per token per hour)
		const rateLimitKey = `invitation-accept:${token}`;
		if (!checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000)) {
			return res
				.status(429)
				.json({ error: "Too many attempts. Please try again later." });
		}

		const result = await invitationService.acceptInvitation(
			token,
			firstName,
			lastName,
			password,
		);

		logger.info({ email: result.email }, "Invitation accepted");

		res.json({
			success: true,
			message: "Account created successfully. You can sign in shortly.",
			email: result.email,
		});
	} catch (error) {
		logger.error({ error }, "Failed to accept invitation");

		if (error instanceof Error) {
			if (error.message.includes("already accepted")) {
				return res
					.status(400)
					.json({ error: "Invitation already accepted", code: "INV003" });
			}
			if (error.message.includes("expired")) {
				return res
					.status(400)
					.json({ error: "Invitation expired", code: "INV002" });
			}
			if (error.message.includes("already exists")) {
				return res.status(400).json({
					error: "An account with this email already exists",
					code: "INV010",
				});
			}
		}

		res.status(500).json({ error: "Failed to accept invitation" });
	}
});

/**
 * GET /api/invitations
 * List invitations for organization
 * Auth: Required (owner/admin)
 */
router.get(
	"/",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const organizationId = authReq.user.activeOrganizationId;

			const { status, limit = "50", offset = "0" } = req.query;

			const invitations = await invitationService.listInvitations(
				organizationId,
				{
					status: status as string,
					limit: Number(limit),
					offset: Number(offset),
				},
			);

			res.json({ invitations });
		} catch (error) {
			logger.error({ error }, "Failed to list invitations");
			res.status(500).json({ error: "Failed to list invitations" });
		}
	},
);

/**
 * DELETE /api/invitations/:id/cancel
 * Cancel pending invitation
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

			const result = await invitationService.cancelInvitation(
				id,
				organizationId,
			);

			logger.info(
				{ invitationId: id, organizationId, userId },
				"Invitation cancelled",
			);

			res.json(result);
		} catch (error) {
			logger.error({ error }, "Failed to cancel invitation");

			if (error instanceof Error && error.message.includes("not found")) {
				return res
					.status(404)
					.json({ error: "Invitation not found or cannot be cancelled" });
			}

			res.status(500).json({ error: "Failed to cancel invitation" });
		}
	},
);

export default router;
