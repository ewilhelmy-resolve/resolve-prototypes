import { z } from "../docs/openapi.js";

// ============================================================================
// Shared Member Schemas
// ============================================================================

export const MemberRoleSchema = z
	.enum(["owner", "admin", "user"])
	.openapi({ description: "Member role in organization" });

export const MemberStatusSchema = z
	.enum(["active", "inactive"])
	.openapi({ description: "Member status" });

export const MemberSchema = z
	.object({
		userId: z.string().uuid().openapi({ description: "User ID" }),
		email: z.string().email().openapi({ description: "User email" }),
		name: z.string().nullable().openapi({ description: "User full name" }),
		firstName: z
			.string()
			.nullable()
			.openapi({ description: "User first name" }),
		lastName: z.string().nullable().openapi({ description: "User last name" }),
		role: MemberRoleSchema,
		isActive: z.boolean().openapi({ description: "Whether member is active" }),
		joinedAt: z
			.string()
			.datetime()
			.openapi({ description: "When user joined the org" }),
		conversationsCount: z
			.number()
			.openapi({ description: "Number of conversations" }),
	})
	.openapi("Member");

// ============================================================================
// GET /api/organizations/members
// ============================================================================

export const MemberListQuerySchema = z
	.object({
		role: MemberRoleSchema.optional().openapi({
			description: "Filter by role",
		}),
		status: MemberStatusSchema.optional().openapi({
			description: "Filter by status",
		}),
		search: z
			.string()
			.optional()
			.openapi({ description: "Search by name/email" }),
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.default(50)
			.openapi({ description: "Max results" }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.default(0)
			.openapi({ description: "Pagination offset" }),
		sortBy: z
			.enum(["name", "role", "status", "joinedAt", "conversationsCount"])
			.default("joinedAt")
			.openapi({ description: "Sort field" }),
		sortOrder: z
			.enum(["asc", "desc"])
			.default("desc")
			.openapi({ description: "Sort direction" }),
	})
	.openapi("MemberListQuery");

export const MemberListResponseSchema = z
	.object({
		members: z.array(MemberSchema),
		total: z.number().openapi({ description: "Total matching members" }),
		limit: z.number(),
		offset: z.number(),
	})
	.openapi("MemberListResponse");

// ============================================================================
// GET /api/organizations/members/:userId
// ============================================================================

export const MemberDetailResponseSchema = z
	.object({
		member: MemberSchema,
	})
	.openapi("MemberDetailResponse");

// ============================================================================
// PATCH /api/organizations/members/:userId/role
// ============================================================================

export const UpdateRoleRequestSchema = z
	.object({
		role: MemberRoleSchema,
	})
	.openapi("UpdateRoleRequest");

export const UpdateRoleResponseSchema = z
	.object({
		success: z.literal(true),
		member: MemberSchema,
		message: z
			.string()
			.openapi({ example: "Member role updated successfully" }),
	})
	.openapi("UpdateRoleResponse");

// ============================================================================
// PATCH /api/organizations/members/:userId/status
// ============================================================================

export const UpdateStatusRequestSchema = z
	.object({
		isActive: z
			.boolean()
			.openapi({ description: "Whether to activate or deactivate" }),
	})
	.openapi("UpdateStatusRequest");

export const UpdateStatusResponseSchema = z
	.object({
		success: z.literal(true),
		member: MemberSchema,
		message: z.string().openapi({ example: "Member activated successfully" }),
	})
	.openapi("UpdateStatusResponse");

// ============================================================================
// DELETE /api/organizations/members/:userId (soft delete)
// ============================================================================

export const RemoveMemberResponseSchema = z
	.object({
		success: z.literal(true),
		message: z
			.string()
			.openapi({ example: "Member removed from organization" }),
		removedMember: z.object({
			userId: z.string().uuid(),
			email: z.string().email(),
		}),
	})
	.openapi("RemoveMemberResponse");

// ============================================================================
// DELETE /api/organizations/members/self/permanent
// DELETE /api/organizations/members/:userId/permanent
// ============================================================================

export const DeletePermanentQuerySchema = z
	.object({
		reason: z
			.string()
			.optional()
			.openapi({ description: "Optional deletion reason" }),
	})
	.openapi("DeletePermanentQuery");

export const DeletePermanentResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({ example: "Account permanently deleted" }),
		removedMember: z.object({
			userId: z.string().uuid(),
			email: z.string().email(),
		}),
	})
	.openapi("DeletePermanentResponse");
