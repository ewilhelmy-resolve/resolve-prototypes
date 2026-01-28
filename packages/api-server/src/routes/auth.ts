import crypto from "crypto";
import express from "express";
import { z } from "zod";
import { logger } from "../config/logger.js";
import { authenticateUser } from "../middleware/auth.js";
import { authRepository } from "../repositories/AuthRepository.js";
import { getSessionService } from "../services/sessionService.js";
import { WebhookService } from "../services/WebhookService.js";
import type { AuthenticatedRequest } from "../types/express.js";

const router = express.Router();
const sessionService = getSessionService();
const webhookService = new WebhookService();

// Simple in-memory rate limiter for resend verification (5 minutes)
const resendRateLimiter = new Map<string, number>();
const RESEND_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function checkResendRateLimit(email: string): boolean {
	const lastResend = resendRateLimiter.get(email);
	if (lastResend && Date.now() - lastResend < RESEND_COOLDOWN_MS) {
		return false; // Rate limited
	}
	resendRateLimiter.set(email, Date.now());

	// Cleanup old entries (older than cooldown period)
	const cutoff = Date.now() - RESEND_COOLDOWN_MS;
	for (const [key, timestamp] of resendRateLimiter.entries()) {
		if (timestamp < cutoff) {
			resendRateLimiter.delete(key);
		}
	}

	return true; // Allowed
}

/**
 * Signup endpoint - Creates a pending user and triggers webhook for email verification
 * POST /auth/signup
 * Body: { name: string, email: string }
 */
router.post("/signup", async (req, res) => {
	try {
		const { firstName, lastName, email, company, password, tosAcceptedAt } =
			req.body;

		if (!firstName || !lastName || !email || !company || !password) {
			return res.status(400).json({
				error:
					"First name, last name, email, company, and password are required",
			});
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({
				error: "Invalid email format",
			});
		}

		// Check if user already exists
		const existingUser = await authRepository.getUserByEmail(email);

		if (existingUser) {
			return res.status(400).json({
				error: "An account with this email already exists",
			});
		}

		// Check if there's already a pending signup for this email
		const existingPending =
			await authRepository.pendingUserExistsByEmail(email);

		if (existingPending) {
			// Delete the existing pending user so they can sign up again
			await authRepository.deletePendingUserByEmail(email);
		}

		// Generate verification token and expiration (24 hours)
		const verificationToken = crypto.randomBytes(32).toString("hex");
		const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		// Trigger webhook to platform for Keycloak user creation and email sending
		// Do this BEFORE storing in database to avoid storing data if webhook fails
		const webhookResponse = await webhookService.sendGenericEvent({
			organizationId: "pending", // Temporary org ID for pending users
			userEmail: email,
			source: "rita-signup",
			action: "user_signup",
			additionalData: {
				first_name: firstName,
				last_name: lastName,
				company,
				password: Buffer.from(password).toString("base64"),
				verification_token: verificationToken,
				verification_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`,
			},
		});

		// If webhook fails, don't store pending user
		if (!webhookResponse.success) {
			logger.error(
				{ email, webhookError: webhookResponse.error },
				"Webhook failed during signup",
			);
			return res.status(500).json({
				error: "Failed to create account. Please try again.",
			});
		}

		// Create pending user (WITHOUT password - it was sent to webhook only)
		const pendingUserId = await authRepository.createPendingUser({
			email,
			first_name: firstName,
			last_name: lastName,
			company,
			verification_token: verificationToken,
			token_expires_at: tokenExpiresAt,
			tos_accepted_at: tosAcceptedAt || null,
		});

		logger.info(
			{
				email,
				pendingUserId,
				tokenExpiresAt,
			},
			"User signup initiated, verification email triggered",
		);

		res.json({
			success: true,
			message:
				"Signup successful. Please check your email for verification instructions.",
		});
	} catch (error) {
		logger.error({ error }, "Signup failed");
		res.status(500).json({
			error: "Signup failed. Please try again.",
		});
	}
});

/**
 * Resend verification email endpoint
 * POST /auth/resend-verification
 * Body: { email: string }
 */
router.post("/resend-verification", async (req, res) => {
	try {
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({
				error: "Email is required",
			});
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({
				error: "Invalid email format",
			});
		}

		// Check rate limit
		if (!checkResendRateLimit(email)) {
			return res.status(429).json({
				error:
					"Please wait 5 minutes before requesting another verification email",
			});
		}

		// Find pending user
		const pendingUser = await authRepository.getPendingUserByEmail(email);

		if (!pendingUser) {
			// Don't reveal if email exists or not (security)
			return res.json({
				success: true,
				message: "If a pending verification exists, a new email has been sent",
			});
		}

		// Generate NEW verification token
		const verificationToken = crypto.randomBytes(32).toString("hex");
		const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		// Update pending user with new token (only if still pending, not verified)
		const updateResult = await authRepository.updatePendingUserToken(
			email,
			"pending",
			verificationToken,
			tokenExpiresAt,
		);

		// If no rows updated, user already verified or doesn't exist (don't reveal which)
		if (!updateResult) {
			logger.info(
				{ email },
				"Resend verification requested for non-pending user (already verified or not found)",
			);
			return res.json({
				success: true,
				message: "If a pending verification exists, a new email has been sent",
			});
		}

		// Trigger webhook to resend verification email
		await webhookService.sendGenericEvent({
			organizationId: "pending",
			userEmail: email,
			source: "rita-signup",
			action: "resend_verification",
			additionalData: {
				first_name: pendingUser.first_name,
				last_name: pendingUser.last_name,
				company: pendingUser.company,
				verification_token: verificationToken,
				verification_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`,
				pending_user_id: pendingUser.id,
			},
		});

		logger.info(
			{
				email,
				pendingUserId: pendingUser.id,
			},
			"Verification email resent",
		);

		res.json({
			success: true,
			message: "If a pending verification exists, a new email has been sent",
		});
	} catch (error) {
		logger.error({ error }, "Resend verification failed");
		res.status(500).json({
			error: "Failed to resend verification email. Please try again.",
		});
	}
});

/**
 * Login endpoint - Creates a session cookie from a Keycloak access token.
 * This is used for browser-based flows where a cookie is needed (e.g., SSE).
 * POST /auth/login
 * Body: { accessToken: string }
 */
router.post("/login", async (req, res) => {
	try {
		const { accessToken } = req.body;

		if (!accessToken) {
			return res.status(400).json({
				error: "Access token is required",
			});
		}

		// Create session from Keycloak token
		const { session, cookie } =
			await sessionService.createSessionFromKeycloak(accessToken);

		// Set HttpOnly cookie
		res.setHeader("Set-Cookie", cookie);

		logger.info(
			{
				userId: session.userId,
				sessionId: session.sessionId,
			},
			"User logged in and session cookie created",
		);

		res.json({
			success: true,
			user: {
				id: session.userId,
				email: session.userEmail,
				firstName: session.firstName,
				lastName: session.lastName,
				organizationId: session.organizationId,
			},
			session: {
				id: session.sessionId,
				expiresAt: session.expiresAt,
			},
		});
	} catch (error) {
		logger.error({ error }, "Login failed");
		if (
			error instanceof Error &&
			error.message.includes("Invalid Keycloak token")
		) {
			return res.status(401).json({
				error: "Invalid authentication credentials",
			});
		}
		res.status(500).json({
			error: "Login failed. Please try again.",
		});
	}
});

/**
 * Logout endpoint - Destroys current session
 * DELETE /auth/logout
 */
router.delete("/logout", async (req, res) => {
	try {
		const sessionId = sessionService.parseSessionIdFromCookie(
			req.headers.cookie,
		);

		if (sessionId) {
			await sessionService.destroySession(sessionId);
		}

		const destroyCookie = sessionService.generateDestroySessionCookie();
		res.setHeader("Set-Cookie", destroyCookie);

		res.json({
			success: true,
			message: "Logged out successfully",
		});
	} catch (error) {
		logger.error({ error }, "Logout failed");
		const destroyCookie = sessionService.generateDestroySessionCookie();
		res.setHeader("Set-Cookie", destroyCookie);
		res.status(500).json({
			error: "Logout failed, but session has been cleared.",
		});
	}
});

/**
 * Logout all devices endpoint - Destroys all user sessions
 * This requires a valid session to identify the user.
 * DELETE /auth/logout-all
 */
router.delete("/logout-all", async (req, res) => {
	try {
		const sessionId = sessionService.parseSessionIdFromCookie(
			req.headers.cookie,
		);
		if (!sessionId) {
			return res.status(401).json({ error: "No active session found" });
		}

		const currentSession = await sessionService.getValidSession(sessionId);
		if (!currentSession) {
			return res.status(401).json({ error: "Invalid session" });
		}

		const deletedCount = await sessionService.destroyUserSessions(
			currentSession.userId,
		);

		const destroyCookie = sessionService.generateDestroySessionCookie();
		res.setHeader("Set-Cookie", destroyCookie);

		logger.info(
			{ userId: currentSession.userId, deletedCount },
			"User logged out from all devices",
		);

		res.json({
			success: true,
			deletedSessions: deletedCount,
		});
	} catch (error) {
		logger.error({ error }, "Logout all devices failed");
		const destroyCookie = sessionService.generateDestroySessionCookie();
		res.setHeader("Set-Cookie", destroyCookie);
		res.status(500).json({
			error:
				"Failed to logout from all devices, but current session has been cleared.",
		});
	}
});

/**
 * Email verification endpoint - Verifies signup token and marks user as ready for Keycloak signin
 * POST /auth/verify-email
 * Body: { token: string }
 */
router.post("/verify-email", async (req, res) => {
	try {
		const { token } = req.body;

		if (!token) {
			return res.status(400).json({
				error: "Verification token is required",
			});
		}

		// Find pending user by token
		const pendingUser = await authRepository.getPendingUserByToken(token);

		if (!pendingUser) {
			return res.status(400).json({
				error: "Invalid or expired verification token",
			});
		}

		// Check if token has expired
		if (new Date() > new Date(pendingUser.token_expires_at)) {
			// Clean up expired token
			await authRepository.deletePendingUserById(pendingUser.id);
			return res.status(400).json({
				error: "Verification token has expired. Please sign up again.",
			});
		}

		// Check if user already exists (someone might have been created in the meantime)
		const existingUser = await authRepository.getUserByEmail(pendingUser.email);

		if (existingUser) {
			// Clean up pending user since they already exist
			await authRepository.deletePendingUserById(pendingUser.id);
			return res.status(400).json({
				error:
					"An account with this email already exists. Please sign in instead.",
			});
		}

		// Mark user as verified (record will be deleted after org creation on first login)
		await authRepository.updatePendingUserStatus(pendingUser.id, "verified");

		logger.info(
			{
				email: pendingUser.email,
				pendingUserId: pendingUser.id,
			},
			"Email verification successful, user ready for Keycloak signin",
		);

		res.json({
			success: true,
			message: "Email verified successfully. You can now sign in.",
			email: pendingUser.email,
		});
	} catch (error) {
		logger.error({ error }, "Email verification failed");
		res.status(500).json({
			error: "Email verification failed. Please try again.",
		});
	}
});

/**
 * Session status endpoint - Check if current session cookie is valid
 * GET /auth/session
 */
router.get("/session", async (req, res) => {
	try {
		const sessionId = sessionService.parseSessionIdFromCookie(
			req.headers.cookie,
		);
		if (!sessionId) {
			return res
				.status(401)
				.json({ authenticated: false, error: "No session found" });
		}

		const session = await sessionService.getValidSession(sessionId);
		if (!session) {
			return res
				.status(401)
				.json({ authenticated: false, error: "Invalid or expired session" });
		}

		res.json({
			authenticated: true,
			user: {
				id: session.userId,
				email: session.userEmail,
				firstName: session.firstName,
				lastName: session.lastName,
				organizationId: session.organizationId,
			},
			session: {
				id: session.sessionId,
				expiresAt: session.expiresAt,
				lastAccessedAt: session.lastAccessedAt,
			},
		});
	} catch (error) {
		logger.error({ error }, "Session status check failed");
		res.status(500).json({
			error: "Failed to check session status",
			authenticated: false,
		});
	}
});

/**
 * Get user profile endpoint - Returns current user's profile information
 * GET /auth/profile
 */
router.get("/profile", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const userId = authReq.user.id;

		const user = await authRepository.getUserProfile(userId);

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json({
			success: true,
			user: {
				id: user.user_id,
				email: user.email,
				firstName: user.first_name,
				lastName: user.last_name,
				organizationId: user.active_organization_id,
			},
		});
	} catch (error) {
		logger.error({ error }, "Failed to fetch user profile");
		res.status(500).json({ error: "Internal server error" });
	}
});

// Validation schema for profile updates
const updateProfileSchema = z.object({
	firstName: z.string().min(1).max(100).trim().optional(),
	lastName: z.string().min(1).max(100).trim().optional(),
});

/**
 * Update user profile endpoint - Updates firstName and/or lastName
 * PATCH /auth/profile
 */
router.patch("/profile", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const userId = authReq.user.id;

		// Validate request body
		const validation = updateProfileSchema.safeParse(req.body);
		if (!validation.success) {
			return res.status(400).json({
				error: "Invalid request",
				details: validation.error.issues.map((issue) => ({
					path: issue.path,
					message: issue.message,
				})),
			});
		}

		const { firstName, lastName } = validation.data;

		if (firstName === undefined && lastName === undefined) {
			return res.status(400).json({ error: "No fields to update" });
		}

		// Update database
		const updatedUser = await authRepository.updateUserProfile(userId, {
			firstName,
			lastName,
		});

		if (!updatedUser) {
			return res.status(404).json({ error: "User not found" });
		}

		// Update session with new names
		const sessionId = sessionService.parseSessionIdFromCookie(
			authReq.headers.cookie,
		);
		if (sessionId) {
			await sessionService.updateSession(sessionId, {
				firstName: updatedUser.first_name ?? undefined,
				lastName: updatedUser.last_name ?? undefined,
			});
		}

		logger.info(
			{ userId, firstName, lastName },
			"User profile updated successfully",
		);

		res.json({
			success: true,
			user: {
				id: updatedUser.user_id,
				email: updatedUser.email,
				firstName: updatedUser.first_name,
				lastName: updatedUser.last_name,
			},
		});
	} catch (error) {
		logger.error({ error }, "Failed to update user profile");
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
