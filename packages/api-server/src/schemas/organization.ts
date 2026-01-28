import { z } from "../docs/openapi.js";

// ============================================================================
// Shared Organization Schemas
// ============================================================================

export const OrganizationRoleSchema = z
	.enum(["owner", "admin", "member"])
	.openapi({ description: "User role in organization" });

export const OrganizationSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "Organization ID" }),
		name: z
			.string()
			.openapi({ description: "Organization name", example: "Acme Inc" }),
		created_at: z
			.string()
			.datetime()
			.openapi({ description: "Creation timestamp" }),
		updated_at: z
			.string()
			.datetime()
			.nullable()
			.optional()
			.openapi({ description: "Last update timestamp" }),
	})
	.openapi("Organization");

// ============================================================================
// GET /api/organizations
// ============================================================================

export const OrganizationListItemSchema = z
	.object({
		id: z.string().uuid(),
		name: z.string(),
		role: OrganizationRoleSchema,
		joined_at: z
			.string()
			.datetime()
			.openapi({ description: "When user joined this org" }),
		is_active: z
			.boolean()
			.openapi({ description: "Whether this is user's active org" }),
	})
	.openapi("OrganizationListItem");

export const OrganizationListResponseSchema = z
	.object({
		organizations: z.array(OrganizationListItemSchema),
	})
	.openapi("OrganizationListResponse");

// ============================================================================
// POST /api/organizations/switch
// ============================================================================

export const SwitchOrgRequestSchema = z
	.object({
		organizationId: z
			.string()
			.uuid()
			.openapi({ description: "Target organization ID" }),
	})
	.openapi("SwitchOrgRequest");

export const SwitchOrgResponseSchema = z
	.object({
		success: z.literal(true),
		activeOrganizationId: z.string().uuid(),
		message: z
			.string()
			.openapi({ example: "Active organization switched successfully" }),
	})
	.openapi("SwitchOrgResponse");

// ============================================================================
// POST /api/organizations/create
// ============================================================================

export const CreateOrgRequestSchema = z
	.object({
		name: z
			.string()
			.min(1)
			.openapi({ description: "Organization name", example: "New Company" }),
	})
	.openapi("CreateOrgRequest");

export const CreateOrgResponseSchema = z
	.object({
		organization: OrganizationSchema,
		message: z
			.string()
			.openapi({ example: "Organization created successfully" }),
	})
	.openapi("CreateOrgResponse");

// ============================================================================
// GET /api/organizations/current
// ============================================================================

export const CurrentOrgResponseSchema = z
	.object({
		organization: z.object({
			id: z.string().uuid(),
			name: z.string(),
			created_at: z.string().datetime(),
			user_role: OrganizationRoleSchema,
			member_count: z.coerce
				.number()
				.openapi({ description: "Total members in org" }),
		}),
	})
	.openapi("CurrentOrgResponse");

// ============================================================================
// PATCH /api/organizations/:id
// ============================================================================

export const UpdateOrgRequestSchema = z
	.object({
		name: z
			.string()
			.min(1)
			.max(100)
			.trim()
			.openapi({ description: "New organization name" }),
	})
	.openapi("UpdateOrgRequest");

export const UpdateOrgResponseSchema = z
	.object({
		success: z.literal(true),
		organization: OrganizationSchema,
	})
	.openapi("UpdateOrgResponse");
