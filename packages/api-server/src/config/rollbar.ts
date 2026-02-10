import crypto from "crypto";
import Rollbar from "rollbar";
import { logger } from "./logger.js";

// Initialize Rollbar only if access token is provided
const rollbarToken = process.env.ROLLBAR_ACCESS_TOKEN;
const hashSalt = process.env.ROLLBAR_HASH_SALT || "rollbar-default-salt";

/**
 * Sensitive fields to scrub from error payloads
 * These patterns will be replaced with asterisks in Rollbar
 */
const SCRUB_FIELDS = [
	"password",
	"passwd",
	"secret",
	"token",
	"api_token",
	"apiToken",
	"api_key",
	"apiKey",
	"authorization",
	"auth",
	"cookie",
	"session",
	"sessionId",
	"session_id",
	"credentials",
	"credit_card",
	"creditCard",
	"card_number",
	"cardNumber",
	"cvv",
	"ssn",
	"social_security",
	"private_key",
	"privateKey",
	"access_token",
	"accessToken",
	"refresh_token",
	"refreshToken",
	"bearer",
	"jwt",
	"x-api-key",
	"x-auth-token",
];

/**
 * Allowlist of safe fields that can be sent in extra/custom data
 * Any field not in this list will be filtered out
 */
const SAFE_EXTRA_FIELDS = [
	"path",
	"method",
	"statusCode",
	"errorCode",
	"errorType",
	"action",
	"resource",
	"duration",
	"timestamp",
	"version",
	"environment",
	"feature",
	"component",
	"operation",
	"count",
	"size",
	"retry",
	"attempt",
];

/**
 * Hash sensitive identifiers for privacy compliance
 * Uses SHA-256 with secret salt from env var
 */
function hashIdentifier(value: string | undefined): string | undefined {
	if (!value) return undefined;
	// Use first 12 chars of hash for readability while maintaining uniqueness
	return crypto
		.createHash("sha256")
		.update(`${hashSalt}:${value}`)
		.digest("hex")
		.substring(0, 12);
}

/**
 * Patterns to redact from error messages and stack traces
 */
const SENSITIVE_PATTERNS = [
	// Connection strings
	/postgres(ql)?:\/\/[^\s]+/gi,
	/mongodb(\+srv)?:\/\/[^\s]+/gi,
	/redis:\/\/[^\s]+/gi,
	/mysql:\/\/[^\s]+/gi,
	// API keys and tokens (common formats)
	/Bearer\s+[A-Za-z0-9\-_]+/gi,
	/api[_-]?key[=:]\s*["']?[A-Za-z0-9\-_]+["']?/gi,
	/token[=:]\s*["']?[A-Za-z0-9\-_]+["']?/gi,
	/password[=:]\s*["']?[^\s"']+["']?/gi,
	// File paths that might reveal infrastructure
	/\/home\/[^\s]+/g,
	/\/Users\/[^\s]+/g,
	/C:\\Users\\[^\s]+/gi,
];

/**
 * Sanitize text by redacting sensitive patterns
 */
function sanitizeText(text: string): string {
	let sanitized = text;
	for (const pattern of SENSITIVE_PATTERNS) {
		sanitized = sanitized.replace(pattern, "[REDACTED]");
	}
	return sanitized;
}

/**
 * Transform callback to sanitize payloads before sending to Rollbar
 */
function transformPayload(payload: Record<string, unknown>): void {
	// Sanitize error message
	const body = payload.body as Record<string, unknown> | undefined;
	if (body?.trace) {
		const trace = body.trace as Record<string, unknown>;
		if (trace.exception) {
			const exception = trace.exception as Record<string, unknown>;
			if (typeof exception.message === "string") {
				exception.message = sanitizeText(exception.message);
			}
		}
		// Sanitize stack frames
		if (Array.isArray(trace.frames)) {
			for (const frame of trace.frames) {
				if (typeof frame.filename === "string") {
					frame.filename = sanitizeText(frame.filename);
				}
			}
		}
	}
}

/**
 * Sanitize extra data by filtering to only allowlisted fields
 */
function sanitizeExtra(
	extra: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!extra) return undefined;

	const sanitized: Record<string, unknown> = {};
	for (const key of SAFE_EXTRA_FIELDS) {
		if (key in extra && extra[key] !== undefined) {
			const value = extra[key];
			// Only allow primitive values (string, number, boolean)
			if (
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean"
			) {
				sanitized[key] = value;
			}
		}
	}

	return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export const rollbar = rollbarToken
	? new Rollbar({
			accessToken: rollbarToken,
			environment: process.env.NODE_ENV || "development",
			captureUncaught: true,
			captureUnhandledRejections: true,
			// Rate limiting to prevent cost issues and data leakage at scale
			itemsPerMinute: 60,
			// Scrub sensitive fields from all payloads
			scrubFields: SCRUB_FIELDS,
			// Additional scrub settings
			scrubPaths: ["body.password", "body.token", "headers.authorization"],
			// Don't include request body by default (may contain sensitive data)
			includeItemsInTelemetry: false,
			// Transform payload to sanitize stack traces and error messages
			transform: transformPayload,
			// Minimal server info - no filesystem paths
			payload: {
				server: {
					// Only include environment, not filesystem paths
					environment: process.env.NODE_ENV || "development",
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
 * User and org IDs are hashed for privacy compliance
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

	// Hash identifiers for privacy
	const custom = request
		? {
				userHash: hashIdentifier(request.userId),
				orgHash: hashIdentifier(request.organizationId),
				path: request.path,
				method: request.method,
			}
		: undefined;

	rollbar.error(error, custom);
}

/**
 * Report warning to Rollbar
 * Extra data is sanitized to allowlisted fields only
 */
export function reportWarning(
	message: string,
	extra?: Record<string, unknown>,
): void {
	if (!rollbar) return;
	rollbar.warning(message, sanitizeExtra(extra));
}

/**
 * Report info to Rollbar
 * Extra data is sanitized to allowlisted fields only
 */
export function reportInfo(
	message: string,
	extra?: Record<string, unknown>,
): void {
	if (!rollbar) return;
	rollbar.info(message, sanitizeExtra(extra));
}
