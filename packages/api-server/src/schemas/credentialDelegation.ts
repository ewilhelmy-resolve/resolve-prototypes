import { z } from "../docs/openapi.js";

// ============================================================================
// Shared Credential Delegation Schemas
// ============================================================================

export const DelegationStatusSchema = z
	.enum(["pending", "completed", "expired", "cancelled"])
	.openapi({ description: "Delegation status" });

export const ItsmSystemTypeSchema = z
	.enum(["servicenow_itsm", "jira"])
	.openapi({ description: "ITSM system type" });

export const DelegationSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "Delegation ID" }),
		adminEmail: z.string().email().openapi({ description: "IT admin email" }),
		itsmSystemType: ItsmSystemTypeSchema,
		status: DelegationStatusSchema,
		createdAt: z
			.string()
			.datetime()
			.openapi({ description: "Created timestamp" }),
		expiresAt: z
			.string()
			.datetime()
			.openapi({ description: "Expiration timestamp" }),
		completedAt: z
			.string()
			.datetime()
			.nullable()
			.openapi({ description: "Completion timestamp" }),
	})
	.openapi("CredentialDelegation");

// ============================================================================
// POST /api/credential-delegations/create
// ============================================================================

export const CreateDelegationRequestSchema = z
	.object({
		admin_email: z
			.string()
			.email()
			.openapi({ description: "IT admin email to send delegation to" }),
		itsm_system_type: ItsmSystemTypeSchema,
	})
	.openapi("CreateDelegationRequest");

export const CreateDelegationResponseSchema = z
	.object({
		success: z.literal(true),
		delegation_id: z.string().uuid(),
		message: z
			.string()
			.openapi({ example: "Credential delegation email sent" }),
		expires_at: z.string().datetime(),
	})
	.openapi("CreateDelegationResponse");

// ============================================================================
// GET /api/credential-delegations/verify/:token
// ============================================================================

export const VerifyDelegationResponseSchema = z
	.object({
		valid: z.boolean(),
		organization_name: z.string().optional(),
		itsm_system_type: ItsmSystemTypeSchema.optional(),
		expires_at: z.string().datetime().optional(),
		reason: z.string().optional().openapi({ description: "Reason if invalid" }),
	})
	.openapi("VerifyDelegationResponse");

// ============================================================================
// POST /api/credential-delegations/submit
// ============================================================================

export const SubmitCredentialsRequestSchema = z
	.object({
		token: z.string().length(64).openapi({ description: "Delegation token" }),
		credentials: z.record(z.string(), z.any()).openapi({
			description: "ITSM credentials (varies by system type)",
			example: {
				instance_url: "https://company.service-now.com",
				username: "admin",
				password: "***",
			},
		}),
	})
	.openapi("SubmitCredentialsRequest");

export const SubmitCredentialsResponseSchema = z
	.object({
		success: z.literal(true),
		delegation_id: z.string().uuid(),
		message: z
			.string()
			.openapi({ example: "Credentials submitted successfully" }),
	})
	.openapi("SubmitCredentialsResponse");

// ============================================================================
// GET /api/credential-delegations/status/:token
// ============================================================================

export const DelegationStatusResponseSchema = z
	.object({
		status: DelegationStatusSchema,
		itsm_system_type: ItsmSystemTypeSchema,
		created_at: z.string().datetime(),
		expires_at: z.string().datetime(),
		completed_at: z.string().datetime().nullable(),
	})
	.openapi("DelegationStatusResponse");

// ============================================================================
// GET /api/credential-delegations
// ============================================================================

export const DelegationListQuerySchema = z
	.object({
		status: DelegationStatusSchema.optional().openapi({
			description: "Filter by status",
		}),
		system_type: ItsmSystemTypeSchema.optional().openapi({
			description: "Filter by ITSM system",
		}),
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.optional()
			.openapi({ description: "Max results" }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.optional()
			.openapi({ description: "Pagination offset" }),
	})
	.openapi("DelegationListQuery");

export const DelegationListResponseSchema = z
	.object({
		delegations: z.array(DelegationSchema),
	})
	.openapi("DelegationListResponse");

// ============================================================================
// DELETE /api/credential-delegations/:id/cancel
// ============================================================================

export const CancelDelegationResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({ example: "Delegation cancelled" }),
	})
	.openapi("CancelDelegationResponse");
