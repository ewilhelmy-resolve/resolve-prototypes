import type { NextFunction, Request, Response } from "express";
import { reportError } from "../config/rollbar.js";

/**
 * Validate and extract only expected user fields
 * Prevents unexpected properties from leaking to Rollbar
 */
function extractUserContext(req: Request): {
	userId?: string;
	organizationId?: string;
} {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const user = (req as any).user;

	if (!user || typeof user !== "object") {
		return {};
	}

	// Only extract expected string fields
	const userId = typeof user.id === "string" ? user.id : undefined;
	const organizationId =
		typeof user.activeOrganizationId === "string"
			? user.activeOrganizationId
			: undefined;

	return { userId, organizationId };
}

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
	// Extract validated user context
	const { userId, organizationId } = extractUserContext(req);

	// Report to Rollbar with only validated fields
	reportError(err, {
		userId,
		organizationId,
		path: req.path,
		method: req.method,
	});

	// Pass to next error handler
	next(err);
}
