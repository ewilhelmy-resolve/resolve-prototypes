/**
 * Valkey (Redis) client configuration
 *
 * Used for retrieving iframe workflow payloads stored by host applications.
 *
 * Dev mode: Session keys starting with "dev-" or "demo-" return mock payloads
 * without requiring actual Valkey connection (when NODE_ENV !== "production").
 */

import Redis from "ioredis";
import { logger } from "./logger.js";

let valkeyClient: Redis | null = null;

// =============================================================================
// Dev Mode Mock Payloads
// =============================================================================
// Returns mock config for dev-* and demo-* session keys in non-production.
// Keeps IframeService.ts clean and production-ready.

/**
 * Generate mock Valkey payload for dev session keys.
 * Supports: dev-test-session, dev-activity-{id}, dev-activity-{id}-{suffix}
 */
export function getDevMockPayload(sessionKey: string): string | null {
	if (process.env.NODE_ENV === "production") return null;
	if (!sessionKey.startsWith("dev-") && !sessionKey.startsWith("demo-"))
		return null;

	// Parse activityId from session key: dev-activity-1001 or demo-activity-1001-A
	const activityMatch = sessionKey.match(/(?:dev|demo)-activity-(\d+)/);
	const activityId = activityMatch ? parseInt(activityMatch[1]) : undefined;
	const activityName = activityId ? `Activity ${activityId}` : undefined;

	const mockPayload = {
		tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
		tenantName: "Dev Test Org",
		userGuid: "11111111-2222-3333-4444-555555555555",
		tabInstanceId: "dev-tab-instance",
		accessToken: "dev-access-token",
		refreshToken: "dev-refresh-token",
		clientId: "dev-client",
		clientKey: "dev-key",
		tokenExpiry: 9999999999,
		actionsApiBaseUrl: "http://localhost:3001",
		context: activityId
			? { designer: "activity", activityId, activityName }
			: undefined,
		uiConfig: {
			titleText: activityName || "Ask Workflow Designer",
			welcomeText:
				"I can help you build workflow automations. Describe what you want to automate.",
			placeholderText: "Describe your workflow...",
		},
	};

	logger.info({ sessionKey }, "Dev mode: returning mock Valkey payload");
	return JSON.stringify(mockPayload);
}
let valkeyUrl: string | null = null;

/**
 * Get masked Valkey URL for debugging (hides password)
 */
export function getValkeyUrlMasked(): string {
	if (!valkeyUrl) return "not configured";
	return valkeyUrl.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

/**
 * Get Valkey connection status
 */
export function getValkeyStatus(): {
	configured: boolean;
	url: string;
	connected: boolean;
} {
	return {
		configured: !!valkeyUrl,
		url: getValkeyUrlMasked(),
		connected: valkeyClient?.status === "ready",
	};
}

export function getValkeyClient(): Redis {
	if (!valkeyClient) {
		let url = process.env.VALKEY_URL || process.env.REDIS_URL;
		if (!url) {
			throw new Error("VALKEY_URL or REDIS_URL must be set");
		}

		// Auto-add rediss:// prefix if missing (required for TLS)
		if (!url.startsWith("redis://") && !url.startsWith("rediss://")) {
			url = `rediss://${url}`;
			logger.info("Added rediss:// prefix to Valkey URL for TLS");
		}

		// Store URL for status checking
		valkeyUrl = url;

		// Mask URL for logging (show host only)
		const maskedUrl = url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
		logger.info({ url: maskedUrl }, "Initializing Valkey client");

		// Extract hostname for TLS servername (required for AWS/managed providers)
		const parsedUrl = new URL(url);
		const useTls = url.startsWith("rediss://");

		valkeyClient = new Redis(url, {
			maxRetriesPerRequest: 3,
			connectTimeout: 5000,
			commandTimeout: 5000,
			lazyConnect: true,
			// Only enable TLS for rediss:// URLs (production), skip for redis:// (local dev)
			...(useTls && {
				tls: {
					servername: parsedUrl.hostname,
				},
			}),
			retryStrategy: (times) => {
				if (times > 3) {
					logger.error({ times }, "Valkey connection failed after max retries");
					return null;
				}
				const delay = Math.min(times * 200, 2000);
				logger.warn(
					{ attempt: times, nextRetryMs: delay },
					"Valkey connection retry",
				);
				return delay;
			},
		});

		valkeyClient.on("connect", () => {
			logger.info("Valkey client connected");
		});

		valkeyClient.on("error", (err) => {
			logger.error({ error: err.message }, "Valkey client error");
		});

		valkeyClient.on("close", () => {
			logger.info("Valkey client connection closed");
		});
	}

	return valkeyClient;
}

/**
 * Close Valkey connection (for graceful shutdown)
 */
export async function closeValkeyConnection(): Promise<void> {
	if (valkeyClient) {
		await valkeyClient.quit();
		valkeyClient = null;
		logger.info("Valkey client disconnected");
	}
}

// =============================================================================
// Jarvis-to-Rita ID Mapping
// =============================================================================
// Maps Jarvis IDs (tenantId, userGuid) to Rita internal IDs (organization_id,
// user_id). Permanent cache to avoid repeated DB lookups.
//
// Note: userGuid is the Keycloak user ID from the shared Keycloak instance
// used by both Jarvis and Rita for authentication. While Keycloak is shared,
// Rita maintains its own user_profiles table with additional profile data.

const JARVIS_ORG_PREFIX = "Rita_jarvis_org:";
const JARVIS_USER_PREFIX = "Rita_jarvis_user:";

/**
 * Get Rita organization ID from Jarvis tenant ID
 * @returns Rita org UUID or null if not mapped
 */
export async function getRitaOrgId(
	jarvisTenantId: string,
): Promise<string | null> {
	const client = getValkeyClient();
	const data = await client.get(`${JARVIS_ORG_PREFIX}${jarvisTenantId}`);
	if (!data) return null;
	try {
		return JSON.parse(data).organization_id;
	} catch {
		logger.warn({ jarvisTenantId }, "Invalid JSON in Rita org mapping");
		return null;
	}
}

/**
 * Get Rita user ID from Jarvis user GUID (Keycloak user ID)
 * @param jarvisGuid - Keycloak user ID from shared Keycloak instance
 * @returns Rita user_profiles.user_id or null if not mapped
 */
export async function getRitaUserId(
	jarvisGuid: string,
): Promise<string | null> {
	const client = getValkeyClient();
	const data = await client.get(`${JARVIS_USER_PREFIX}${jarvisGuid}`);
	if (!data) return null;
	try {
		return JSON.parse(data).user_id;
	} catch {
		logger.warn({ jarvisGuid }, "Invalid JSON in Rita user mapping");
		return null;
	}
}

/**
 * Save Jarvis tenant → Rita org mapping
 */
export async function setRitaOrgMapping(
	jarvisTenantId: string,
	ritaOrgId: string,
): Promise<void> {
	const client = getValkeyClient();
	await client.set(
		`${JARVIS_ORG_PREFIX}${jarvisTenantId}`,
		JSON.stringify({ organization_id: ritaOrgId }),
	);
	logger.info({ jarvisTenantId, ritaOrgId }, "Saved Jarvis→Rita org mapping");
}

/**
 * Save Jarvis user → Rita user mapping
 * @param jarvisGuid - Keycloak user ID from shared Keycloak instance
 * @param ritaUserId - Rita user_profiles.user_id
 */
export async function setRitaUserMapping(
	jarvisGuid: string,
	ritaUserId: string,
): Promise<void> {
	const client = getValkeyClient();
	await client.set(
		`${JARVIS_USER_PREFIX}${jarvisGuid}`,
		JSON.stringify({ user_id: ritaUserId }),
	);
	logger.info({ jarvisGuid, ritaUserId }, "Saved Jarvis→Rita user mapping");
}
