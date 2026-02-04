import { z } from "../docs/openapi.js";

// ============================================================================
// Shared Invitation Schemas
// ============================================================================

export const InvitationStatusSchema = z
	.enum(["pending", "accepted", "expired", "cancelled"])
	.openapi({ description: "Invitation status" });

export const InvitationSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "Invitation ID" }),
		email: z.string().email().openapi({ description: "Invited email address" }),
		status: InvitationStatusSchema,
		invitedBy: z
			.string()
			.uuid()
			.openapi({ description: "User who sent invitation" }),
		createdAt: z
			.string()
			.datetime()
			.openapi({ description: "Invitation created at" }),
		expiresAt: z
			.string()
			.datetime()
			.openapi({ description: "Invitation expires at" }),
		acceptedAt: z
			.string()
			.datetime()
			.nullable()
			.openapi({ description: "When invitation was accepted" }),
	})
	.openapi("Invitation");

// ============================================================================
// POST /api/invitations/send
// ============================================================================

export const SendInvitationsRequestSchema = z
	.object({
		emails: z
			.array(z.string().email())
			.min(1)
			.max(50)
			.openapi({ description: "Email addresses to invite (max 50)" }),
	})
	.openapi("SendInvitationsRequest");

export const SendInvitationsResultSchema = z
	.object({
		email: z.string().email(),
		success: z.boolean(),
		error: z
			.string()
			.optional()
			.openapi({ description: "Error message if failed" }),
	})
	.openapi("SendInvitationsResult");

export const SendInvitationsResponseSchema = z
	.object({
		successCount: z
			.number()
			.openapi({ description: "Number of successful invitations" }),
		failureCount: z
			.number()
			.openapi({ description: "Number of failed invitations" }),
		results: z.array(SendInvitationsResultSchema),
	})
	.openapi("SendInvitationsResponse");

// ============================================================================
// GET /api/invitations/verify/:token
// ============================================================================

export const VerifyInvitationResponseSchema = z
	.object({
		valid: z.boolean(),
		email: z.string().email().optional(),
		organizationName: z.string().optional(),
		expiresAt: z.string().datetime().optional(),
		error: z.string().optional().openapi({ description: "Error if invalid" }),
		code: z
			.string()
			.optional()
			.openapi({ description: "Error code if invalid" }),
	})
	.openapi("VerifyInvitationResponse");

// ============================================================================
// POST /api/invitations/accept
// ============================================================================

export const AcceptInvitationRequestSchema = z
	.object({
		token: z
			.string()
			.length(64)
			.openapi({ description: "Invitation token from email" }),
		firstName: z.string().min(1).openapi({ description: "User first name" }),
		lastName: z.string().min(1).openapi({ description: "User last name" }),
		password: z.string().min(1).openapi({ description: "User password" }),
	})
	.openapi("AcceptInvitationRequest");

export const AcceptInvitationResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({
			example: "Account created successfully. You can sign in shortly.",
		}),
		email: z.string().email(),
	})
	.openapi("AcceptInvitationResponse");

// ============================================================================
// GET /api/invitations
// ============================================================================

export const InvitationListQuerySchema = z
	.object({
		status: InvitationStatusSchema.optional().openapi({
			description: "Filter by status",
		}),
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
	})
	.openapi("InvitationListQuery");

export const InvitationListResponseSchema = z
	.object({
		invitations: z.array(InvitationSchema),
	})
	.openapi("InvitationListResponse");

// ============================================================================
// DELETE /api/invitations/:id/cancel
// ============================================================================

export const CancelInvitationResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({ example: "Invitation cancelled" }),
	})
	.openapi("CancelInvitationResponse");
