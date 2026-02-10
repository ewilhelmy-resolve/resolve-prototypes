import Rollbar from "rollbar";
import { logger } from "./logger.js";

// Initialize Rollbar only if access token is provided
const rollbarToken = process.env.ROLLBAR_ACCESS_TOKEN;

export const rollbar = rollbarToken
	? new Rollbar({
			accessToken: rollbarToken,
			environment: process.env.NODE_ENV || "development",
			captureUncaught: true,
			captureUnhandledRejections: true,
			payload: {
				server: {
					root: process.cwd(),
				},
			},
		})
	: null;

if (rollbar) {
	logger.info("Rollbar initialized successfully");
} else {
	logger.warn("Rollbar not initialized - ROLLBAR_ACCESS_TOKEN not configured");
}

/**
 * Report error to Rollbar with optional request context
 */
export function reportError(
	error: Error,
	request?: {
		userId?: string;
		organizationId?: string;
		path?: string;
		method?: string;
	},
): void {
	if (!rollbar) return;

	const custom = request
		? {
				userId: request.userId,
				organizationId: request.organizationId,
				path: request.path,
				method: request.method,
			}
		: undefined;

	rollbar.error(error, custom);
}

/**
 * Report warning to Rollbar
 */
export function reportWarning(
	message: string,
	extra?: Record<string, unknown>,
): void {
	if (!rollbar) return;
	rollbar.warning(message, extra);
}

/**
 * Report info to Rollbar
 */
export function reportInfo(
	message: string,
	extra?: Record<string, unknown>,
): void {
	if (!rollbar) return;
	rollbar.info(message, extra);
}
