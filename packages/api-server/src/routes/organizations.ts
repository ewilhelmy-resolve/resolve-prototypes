import express from "express";
import { pool } from "../config/database.js";
import { logger } from "../config/logger.js";
import { registry, z } from "../docs/openapi.js";
import { authenticateUser, requireRole } from "../middleware/auth.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import {
	CreateOrgRequestSchema,
	CreateOrgResponseSchema,
	CurrentOrgResponseSchema,
	OrganizationListResponseSchema,
	SwitchOrgRequestSchema,
	SwitchOrgResponseSchema,
	UpdateOrgRequestSchema,
	UpdateOrgResponseSchema,
} from "../schemas/organization.js";
import type { AuthenticatedRequest } from "../types/express.js";

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/organizations",
	tags: ["Organizations"],
	summary: "List user organizations",
	description: "Get all organizations the authenticated user is a member of.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	responses: {
		200: {
			description: "List of organizations",
			content: {
				"application/json": { schema: OrganizationListResponseSchema },
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
	method: "post",
	path: "/api/organizations/switch",
	tags: ["Organizations"],
	summary: "Switch active organization",
	description:
		"Switch the user's active organization. User must be a member of the target organization.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: SwitchOrgRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Organization switched successfully",
			content: { "application/json": { schema: SwitchOrgResponseSchema } },
		},
		400: {
			description: "Organization ID is required",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Not a member of target organization",
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
	path: "/api/organizations/create",
	tags: ["Organizations"],
	summary: "Create organization",
	description:
		"Create a new organization. The creating user becomes the owner.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateOrgRequestSchema } },
		},
	},
	responses: {
		201: {
			description: "Organization created",
			content: { "application/json": { schema: CreateOrgResponseSchema } },
		},
		400: {
			description: "Organization name is required",
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
	method: "get",
	path: "/api/organizations/current",
	tags: ["Organizations"],
	summary: "Get current organization",
	description: "Get details of the user's currently active organization.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	responses: {
		200: {
			description: "Current organization details",
			content: { "application/json": { schema: CurrentOrgResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Organization not found",
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
	path: "/api/organizations/{id}",
	tags: ["Organizations"],
	summary: "Update organization",
	description:
		"Update organization name. Requires owner or admin role. Can only update active organization.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Organization ID" }),
		}),
		body: {
			content: { "application/json": { schema: UpdateOrgRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Organization updated",
			content: { "application/json": { schema: UpdateOrgResponseSchema } },
		},
		400: {
			description: "Validation error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires owner/admin or not active org",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Organization not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

const router = express.Router();

// Get user's organizations
router.get("/", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const result = await pool.query(
			`
      SELECT
        o.id,
        o.name,
        om.role,
        om.joined_at,
        (o.id = up.active_organization_id) as is_active
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      JOIN user_profiles up ON up.user_id = om.user_id
      WHERE om.user_id = $1
      ORDER BY om.joined_at ASC
    `,
			[authReq.user.id],
		);

		res.json({ organizations: result.rows });
	} catch (error) {
		console.error("Error fetching organizations:", error);
		res.status(500).json({ error: "Failed to fetch organizations" });
	}
});

// Switch active organization
router.post("/switch", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { organizationId } = req.body;

		if (!organizationId) {
			return res.status(400).json({ error: "Organization ID is required" });
		}

		// Verify user is a member of the target organization
		const membershipCheck = await pool.query(
			"SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2",
			[organizationId, authReq.user.id],
		);

		if (membershipCheck.rows.length === 0) {
			return res
				.status(403)
				.json({ error: "You are not a member of this organization" });
		}

		// Update user's active organization
		await pool.query(
			"UPDATE user_profiles SET active_organization_id = $1 WHERE user_id = $2",
			[organizationId, authReq.user.id],
		);

		// Log the organization switch for audit trail
		await pool.query(
			`
      INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
      VALUES ($1, $2, 'switch_organization', 'organization', $1, $3)
    `,
			[
				organizationId,
				authReq.user.id,
				JSON.stringify({
					from_organization_id: authReq.user.activeOrganizationId,
					to_organization_id: organizationId,
				}),
			],
		);

		res.json({
			success: true,
			activeOrganizationId: organizationId,
			message: "Active organization switched successfully",
		});
	} catch (error) {
		console.error("Error switching organization:", error);
		res.status(500).json({ error: "Failed to switch organization" });
	}
});

// Create new organization
router.post("/create", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { name } = req.body;

		if (!name || name.trim().length === 0) {
			return res.status(400).json({ error: "Organization name is required" });
		}

		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			// Create the organization
			const orgResult = await client.query(
				"INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, created_at",
				[name.trim()],
			);
			const organization = orgResult.rows[0];

			// Add user as owner
			await client.query(
				"INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)",
				[organization.id, authReq.user.id, "owner"],
			);

			// Log organization creation
			await client.query(
				`
        INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id)
        VALUES ($1, $2, 'create_organization', 'organization', $1)
      `,
				[organization.id, authReq.user.id],
			);

			await client.query("COMMIT");

			res.status(201).json({
				organization,
				message: "Organization created successfully",
			});
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error("Error creating organization:", error);
		res.status(500).json({ error: "Failed to create organization" });
	}
});

// Get organization details (for active organization)
router.get("/current", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const result = await pool.query(
			`
      SELECT
        o.id,
        o.name,
        o.created_at,
        om.role as user_role,
        (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as member_count
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE o.id = $1 AND om.user_id = $2
    `,
			[authReq.user.activeOrganizationId, authReq.user.id],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Organization not found" });
		}

		res.json({ organization: result.rows[0] });
	} catch (error) {
		console.error("Error fetching current organization:", error);
		res.status(500).json({ error: "Failed to fetch organization details" });
	}
});

// Validation schema for organization update
const updateOrganizationSchema = z.object({
	name: z
		.string()
		.min(1, "Organization name is required")
		.max(100, "Organization name is too long")
		.trim(),
});

/**
 * PATCH /api/organizations/:id
 * Update organization name
 * Auth: Required (owner/admin only)
 */
router.patch(
	"/:id",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const { id } = req.params;
			const userId = authReq.user.id;
			const organizationId = authReq.user.activeOrganizationId;

			// Validate that the organization ID matches the user's active organization
			if (id !== organizationId) {
				return res
					.status(403)
					.json({ error: "You can only update your active organization" });
			}

			// Validate request body
			const validation = updateOrganizationSchema.safeParse(req.body);
			if (!validation.success) {
				return res.status(400).json({
					error: "Invalid request",
					details: validation.error.issues.map((issue) => ({
						path: issue.path,
						message: issue.message,
					})),
				});
			}

			const { name } = validation.data;

			// Verify user has permission (owner/admin) for this organization
			const membershipCheck = await pool.query(
				"SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2",
				[id, userId],
			);

			if (membershipCheck.rows.length === 0) {
				return res.status(403).json({
					error: "You do not have permission to update this organization",
				});
			}

			// Update organization name
			const result = await pool.query(
				"UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, created_at, updated_at",
				[name, id],
			);

			if (result.rows.length === 0) {
				return res.status(404).json({ error: "Organization not found" });
			}

			const organization = result.rows[0];

			// Log the organization update for audit trail
			await pool.query(
				`
      INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
      VALUES ($1, $2, 'update_organization', 'organization', $1, $3)
    `,
				[
					id,
					userId,
					JSON.stringify({
						field: "name",
						new_value: name,
					}),
				],
			);

			logger.info(
				{
					organizationId: id,
					userId,
					name,
				},
				"Organization name updated",
			);

			res.json({
				success: true,
				organization,
			});
		} catch (error) {
			logger.error({ error }, "Failed to update organization");
			res.status(500).json({ error: "Failed to update organization" });
		}
	},
);

export default router;
