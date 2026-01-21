/**
 * Feature Flag Relay Proxy Service
 *
 * Proxies feature flag requests to the platform API with in-memory LRU caching.
 * Broadcasts flag updates via SSE to connected clients.
 */

import axios, { isAxiosError } from "axios";
import { LRUCache } from "lru-cache";
import { logger } from "../config/logger.js";
import { getSSEService } from "./sse.js";

const PLATFORM_FLAGS_URL =
	process.env.PLATFORM_FLAGS_URL || "https://strangler-facade.resolve.io";
const CACHE_TTL_MS =
	parseInt(process.env.FEATURE_FLAG_CACHE_TTL || "300", 10) * 1000;
const PLATFORM_ENV = process.env.NODE_ENV || "development";

// In-memory LRU cache for feature flags
const flagCache = new LRUCache<string, boolean>({
	max: 500, // Max 500 flag entries
	ttl: CACHE_TTL_MS, // TTL from env (default 5 min)
});

// Client flag names → Platform flag names
const CLIENT_TO_PLATFORM_FLAG_MAP: Record<string, string> = {
	ENABLE_AUTO_PILOT: "auto-pilot",
	ENABLE_AUTO_PILOT_SUGGESTIONS: "auto-pilot-suggestions",
	ENABLE_AUTO_PILOT_ACTIONS: "auto-pilot-actions",
	ENABLE_IFRAME_DEV_TOOLS: "iframe-dev-tools",
};

// Platform flag names → Client flag names (reverse mapping)
const PLATFORM_TO_CLIENT_FLAG_MAP: Record<string, string> = Object.entries(
	CLIENT_TO_PLATFORM_FLAG_MAP,
).reduce(
	(acc, [client, platform]) => {
		acc[platform] = client;
		return acc;
	},
	{} as Record<string, string>,
);

export function getPlatformFlagName(clientKey: string): string {
	return CLIENT_TO_PLATFORM_FLAG_MAP[clientKey] || clientKey;
}

export function getClientFlagName(platformKey: string): string {
	return PLATFORM_TO_CLIENT_FLAG_MAP[platformKey] || platformKey;
}

function getCacheKey(
	flagName: string,
	environment: string,
	tenantId: string,
): string {
	return `${flagName}:${environment}:${tenantId}`;
}

export class FeatureFlagService {
	/**
	 * Check if a feature flag is enabled (cache-first)
	 */
	async isEnabled(flagName: string, tenantId: string): Promise<boolean> {
		const cacheKey = getCacheKey(flagName, PLATFORM_ENV, tenantId);

		try {
			const cached = flagCache.get(cacheKey);

			if (cached !== undefined) {
				logger.debug(
					{ flagName, environment: PLATFORM_ENV, tenantId, cached: true },
					"Feature flag cache hit",
				);
				return cached;
			}

			const response = await axios.get(
				`${PLATFORM_FLAGS_URL}/api/features/is-enabled/${flagName}/${PLATFORM_ENV}/${tenantId}`,
			);

			const isEnabled = response.data;
			const boolValue = Boolean(isEnabled);

			flagCache.set(cacheKey, boolValue);

			logger.debug(
				{
					flagName,
					environment: PLATFORM_ENV,
					tenantId,
					isEnabled: boolValue,
					cached: false,
				},
				"Feature flag fetched from platform",
			);

			return boolValue;
		} catch (error) {
			logger.error(
				{
					error: error instanceof Error ? error.message : String(error),
					status: isAxiosError(error) ? error.response?.status : undefined,
					flagName,
					environment: PLATFORM_ENV,
					tenantId,
				},
				"Feature flag fetch error",
			);
			return false;
		}
	}

	async getFlags(
		flagNames: string[],
		tenantId: string,
	): Promise<Record<string, boolean>> {
		const results = await Promise.allSettled(
			flagNames.map(async (name) => ({
				name,
				value: await this.isEnabled(name, tenantId),
			})),
		);

		return results.reduce(
			(acc, result) => {
				if (result.status === "fulfilled") {
					acc[result.value.name] = result.value.value;
				}
				return acc;
			},
			{} as Record<string, boolean>,
		);
	}

	/**
	 * Update a feature flag rule
	 * Invalidates cache and broadcasts SSE update
	 */
	async updateRule(
		flagName: string,
		isEnabled: boolean,
		organizationId: string,
	): Promise<boolean> {
		try {
			await axios.post(`${PLATFORM_FLAGS_URL}/api/features/${flagName}/rules`, {
				environment: PLATFORM_ENV,
				tenant: organizationId,
				isEnabled: isEnabled,
			});

			// Invalidate cache
			this.invalidateCache(flagName, organizationId);

			// Broadcast SSE update
			this.broadcastFlagUpdate(flagName, isEnabled, organizationId);

			logger.info(
				{ flagName, environment: PLATFORM_ENV, organizationId, isEnabled },
				"Feature flag updated",
			);

			return true;
		} catch (error) {
			logger.error(
				{
					error: error instanceof Error ? error.message : String(error),
					status: isAxiosError(error) ? error.response?.status : undefined,
					flagName,
					environment: PLATFORM_ENV,
					organizationId,
				},
				"Feature flag update error",
			);
			return false;
		}
	}

	/**
	 * Invalidate cache for a specific flag
	 */
	private invalidateCache(flagName: string, tenantId: string): void {
		const cacheKey = getCacheKey(flagName, PLATFORM_ENV, tenantId);
		flagCache.delete(cacheKey);
		logger.debug({ cacheKey }, "Feature flag cache invalidated");
	}

	/**
	 * Broadcast flag update via SSE to all users in organization
	 */
	private broadcastFlagUpdate(
		flagName: string,
		isEnabled: boolean,
		organizationId: string,
	): void {
		const sseService = getSSEService();
		const clientFlagName = getClientFlagName(flagName);

		sseService.sendToOrganization(organizationId, {
			type: "feature_flag_update",
			data: {
				flagName: clientFlagName,
				platformFlagName: flagName,
				environment: PLATFORM_ENV,
				organizationId,
				isEnabled,
				timestamp: new Date().toISOString(),
			},
		} as any);
	}
}

let featureFlagService: FeatureFlagService | null = null;

export function getFeatureFlagService(): FeatureFlagService {
	if (!featureFlagService) {
		featureFlagService = new FeatureFlagService();
	}
	return featureFlagService;
}
