import type { NextFunction, Request, Response } from "express";
import { reportError } from "../config/rollbar.js";
import type { AuthenticatedRequest } from "../types/express.js";

/**
 * Rollbar error handling middleware
 * Must be placed after routes and before the final error handler
 */
export function rollbarErrorMiddleware(
	err: Error,
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	// Extract user context if available
	const authReq = req as AuthenticatedRequest;
	const userContext = authReq.user
		? {
				userId: authReq.user.id,
				organizationId: authReq.user.activeOrganizationId,
				path: req.path,
				method: req.method,
			}
		: {
				path: req.path,
				method: req.method,
			};

	// Report to Rollbar
	reportError(err, userContext);

	// Pass to next error handler
	next(err);
}
