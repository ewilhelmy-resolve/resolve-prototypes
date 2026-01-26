import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { authRepository } from "../repositories/AuthRepository.js";
import { getSessionService } from "../services/sessionService.js";
import type { AuthenticatedRequest } from "../types/express.js";

/**
 * Cookie-only authentication middleware with automatic session extension
 *
 * Validates session cookie for all protected routes and automatically extends
 * session expiration when near expiry (sliding session pattern).
 *
 * Session cookies are created via POST /auth/login after Keycloak authentication.
 *
 * Architecture: Frontend manages Keycloak JWT tokens, backend uses session cookies only.
 * This ensures consistent authentication across all request types (fetch, EventSource, etc.)
 */
export const authenticateUser = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const sessionService = getSessionService();
		const sessionId = sessionService.parseSessionIdFromCookie(
			req.headers.cookie,
		);

		if (!sessionId) {
			res.status(401).json({
				error: "No session found. Please login.",
				code: "NO_AUTH",
			});
			return;
		}

		const session = await sessionService.getValidSession(sessionId);
		if (!session) {
			res.status(401).json({
				error: "Invalid or expired session. Please login again.",
				code: "INVALID_SESSION",
			});
			return;
		}

		// Auto-extend session if near expiry (sliding session)
		const EXTEND_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours
		const timeUntilExpiry = session.expiresAt.getTime() - Date.now();

		if (timeUntilExpiry < EXTEND_THRESHOLD) {
			const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
			await sessionService.updateSession(sessionId, { expiresAt: newExpiry });

			// Update cookie with extended expiration
			const cookie = sessionService.generateSessionCookie(sessionId);
			res.setHeader("Set-Cookie", cookie);

			logger.debug(
				{
					userId: session.userId,
					sessionId: session.sessionId,
					oldExpiry: session.expiresAt,
					newExpiry,
					timeUntilExpiry: Math.floor(timeUntilExpiry / 1000 / 60), // minutes
				},
				"Session auto-extended",
			);
		}

		// Skip org membership check for iframe sessions
		// Iframe sessions use Valkey IDs from host app (Jarvis) - not in Rita's DB
		// Host app handles auth via its own Keycloak; we trust Valkey-provided IDs
		if (!session.isIframeSession) {
			// Check if user is active in their organization (member management)
			const membership = await authRepository.getOrgMembershipStatus(
				session.organizationId,
				session.userId,
			);

			// User not found in organization (membership removed)
			if (!membership) {
				logger.warn(
					{
						userId: session.userId,
						organizationId: session.organizationId,
						sessionId: session.sessionId,
					},
					"User session exists but organization membership not found",
				);

				res.status(403).json({
					error: "You are not a member of this organization",
					code: "NOT_MEMBER",
				});
				return;
			}

			// User exists but is deactivated
			if (!membership.isActive) {
				logger.info(
					{
						userId: session.userId,
						organizationId: session.organizationId,
						sessionId: session.sessionId,
					},
					"API request blocked - user account deactivated",
				);

				res.status(401).json({
					error:
						"Your account has been disabled. Contact your organization administrator.",
					code: "ACCOUNT_DISABLED",
				});
				return;
			}
		}

		req.user = {
			id: session.userId,
			email: session.userEmail,
			activeOrganizationId: session.organizationId,
		};
		req.session = { sessionId: session.sessionId };

		logger.debug(
			{
				userId: session.userId,
				sessionId: session.sessionId,
				endpoint: `${req.method} ${req.path}`,
			},
			"User authenticated via session cookie",
		);
		next();
	} catch (error) {
		logger.error({ error, path: req.path }, "Authentication error");
		res.status(500).json({
			error: "Authentication failed. Please try again.",
			code: "AUTH_ERROR",
		});
	}
};

/**
 * Role-based authorization middleware
 *
 * Checks if the authenticated user has one of the required roles in their active organization.
 * Must be used AFTER authenticateUser middleware.
 *
 * @param allowedRoles - Array of roles that are allowed to access the endpoint
 * @returns Express middleware function
 *
 * @example
 * router.post('/admin-action', authenticateUser, requireRole(['owner', 'admin']), handler);
 */
export const requireRole = (allowedRoles: string[]) => {
	return async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const authReq = req as AuthenticatedRequest;

			// authenticateUser middleware guarantees these exist, but check for type safety
			if (!authReq.user) {
				res.status(401).json({
					error: "Authentication required",
					code: "NO_AUTH",
				});
				return;
			}

			const userId = authReq.user.id;
			const organizationId = authReq.user.activeOrganizationId;

			// Query user's role in their active organization
			const userRole = await authRepository.getUserRole(organizationId, userId);

			if (!userRole) {
				res.status(403).json({
					error: "You are not a member of this organization",
					code: "NOT_MEMBER",
				});
				return;
			}

			if (!allowedRoles.includes(userRole)) {
				res.status(403).json({
					error: `Permission denied. Required role: ${allowedRoles.join(" or ")}`,
					code: "INSUFFICIENT_PERMISSIONS",
				});
				return;
			}

			// User has required role, proceed to route handler
			next();
		} catch (error) {
			logger.error({ error, path: req.path }, "Authorization error");
			res.status(500).json({
				error: "Authorization check failed. Please try again.",
				code: "AUTH_ERROR",
			});
		}
	};
};
