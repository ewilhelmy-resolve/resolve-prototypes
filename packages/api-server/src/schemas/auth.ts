import { z } from "../docs/openapi.js";

// ============================================================================
// Shared Auth Schemas
// ============================================================================

export const AuthUserSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "User ID" }),
		email: z.string().email().openapi({ description: "User email address" }),
		firstName: z
			.string()
			.nullable()
			.openapi({ description: "User first name" }),
		lastName: z.string().nullable().openapi({ description: "User last name" }),
		organizationId: z
			.string()
			.uuid()
			.nullable()
			.openapi({ description: "Active organization ID" }),
	})
	.openapi("AuthUser");

export const AuthSessionSchema = z
	.object({
		id: z.string().openapi({ description: "Session ID" }),
		expiresAt: z
			.string()
			.datetime()
			.openapi({ description: "Session expiration timestamp" }),
		lastAccessedAt: z
			.string()
			.datetime()
			.optional()
			.openapi({ description: "Last access timestamp" }),
	})
	.openapi("AuthSession");

// ============================================================================
// POST /auth/signup
// ============================================================================

export const SignupRequestSchema = z
	.object({
		firstName: z
			.string()
			.min(1)
			.openapi({ description: "User first name", example: "John" }),
		lastName: z
			.string()
			.min(1)
			.openapi({ description: "User last name", example: "Doe" }),
		email: z.string().email().openapi({
			description: "User email address",
			example: "john@example.com",
		}),
		company: z
			.string()
			.min(1)
			.openapi({ description: "Company name", example: "Acme Inc" }),
		password: z.string().min(1).openapi({ description: "User password" }),
		tosAcceptedAt: z
			.string()
			.datetime()
			.optional()
			.openapi({ description: "Timestamp when TOS was accepted" }),
	})
	.openapi("SignupRequest");

export const SignupResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({
			description: "Success message",
			example:
				"Signup successful. Please check your email for verification instructions.",
		}),
	})
	.openapi("SignupResponse");

// ============================================================================
// POST /auth/resend-verification
// ============================================================================

export const ResendVerificationRequestSchema = z
	.object({
		email: z
			.string()
			.email()
			.openapi({ description: "Email address to resend verification to" }),
	})
	.openapi("ResendVerificationRequest");

export const ResendVerificationResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({
			description: "Generic response (does not reveal if email exists)",
			example: "If a pending verification exists, a new email has been sent",
		}),
	})
	.openapi("ResendVerificationResponse");

// ============================================================================
// POST /auth/login
// ============================================================================

export const LoginRequestSchema = z
	.object({
		accessToken: z.string().openapi({
			description: "Keycloak access token from client-side authentication",
		}),
	})
	.openapi("LoginRequest");

export const LoginResponseSchema = z
	.object({
		success: z.literal(true),
		user: AuthUserSchema,
		session: AuthSessionSchema,
	})
	.openapi("LoginResponse");

// ============================================================================
// DELETE /auth/logout
// ============================================================================

export const LogoutResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({
			description: "Logout confirmation",
			example: "Logged out successfully",
		}),
	})
	.openapi("LogoutResponse");

// ============================================================================
// DELETE /auth/logout-all
// ============================================================================

export const LogoutAllResponseSchema = z
	.object({
		success: z.literal(true),
		deletedSessions: z.number().openapi({
			description: "Number of sessions that were destroyed",
			example: 3,
		}),
	})
	.openapi("LogoutAllResponse");

// ============================================================================
// POST /auth/verify-email
// ============================================================================

export const VerifyEmailRequestSchema = z
	.object({
		token: z.string().openapi({
			description: "Email verification token from the verification link",
		}),
	})
	.openapi("VerifyEmailRequest");

export const VerifyEmailResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({
			description: "Verification confirmation",
			example: "Email verified successfully. You can now sign in.",
		}),
		email: z
			.string()
			.email()
			.openapi({ description: "Verified email address" }),
	})
	.openapi("VerifyEmailResponse");

// ============================================================================
// GET /auth/session
// ============================================================================

export const SessionResponseSchema = z
	.object({
		authenticated: z.literal(true),
		user: AuthUserSchema,
		session: AuthSessionSchema,
	})
	.openapi("SessionResponse");

export const SessionUnauthenticatedSchema = z
	.object({
		authenticated: z.literal(false),
		error: z.string().openapi({ description: "Error message" }),
	})
	.openapi("SessionUnauthenticatedResponse");

// ============================================================================
// GET /auth/profile
// ============================================================================

export const ProfileResponseSchema = z
	.object({
		success: z.literal(true),
		user: AuthUserSchema,
	})
	.openapi("ProfileResponse");

// ============================================================================
// PATCH /auth/profile
// ============================================================================

export const UpdateProfileRequestSchema = z
	.object({
		firstName: z
			.string()
			.min(1)
			.max(100)
			.trim()
			.optional()
			.openapi({ description: "New first name" }),
		lastName: z
			.string()
			.min(1)
			.max(100)
			.trim()
			.optional()
			.openapi({ description: "New last name" }),
	})
	.openapi("UpdateProfileRequest");

export const UpdateProfileResponseSchema = z
	.object({
		success: z.literal(true),
		user: z
			.object({
				id: z.string().uuid(),
				email: z.string().email(),
				firstName: z.string().nullable(),
				lastName: z.string().nullable(),
			})
			.openapi("UpdatedUser"),
	})
	.openapi("UpdateProfileResponse");
