/**
 * Feature Flag Relay Proxy Service
 *
 * Proxies feature flag requests to the platform API with Valkey caching.
 * Broadcasts flag updates via SSE to connected clients.
 */

import axios, { isAxiosError } from 'axios';
import { getValkeyClient } from '../config/valkey.js';
import { logger } from '../config/logger.js';
import { getSSEService } from './sse.js';

const PLATFORM_FLAGS_URL =
  process.env.PLATFORM_FLAGS_URL || 'https://strangler-facade.resolve.io';
const CACHE_TTL_SECONDS = parseInt(process.env.FEATURE_FLAG_CACHE_TTL || '300', 10);
const CACHE_KEY_PREFIX = 'ff:';
const PLATFORM_ENV = process.env.NODE_ENV || 'development';

// Client flag names → Platform flag names
const CLIENT_TO_PLATFORM_FLAG_MAP: Record<string, string> = {
  ENABLE_AUTO_PILOT: 'auto-pilot',
  ENABLE_AUTO_PILOT_SUGGESTIONS: 'auto-pilot-suggestions',
  ENABLE_AUTO_PILOT_ACTIONS: 'auto-pilot-actions',
};

// Platform flag names → Client flag names (reverse mapping)
const PLATFORM_TO_CLIENT_FLAG_MAP: Record<string, string> = Object.entries(
  CLIENT_TO_PLATFORM_FLAG_MAP
).reduce(
  (acc, [client, platform]) => {
    acc[platform] = client;
    return acc;
  },
  {} as Record<string, string>
);

export function getPlatformFlagName(clientKey: string): string {
  return CLIENT_TO_PLATFORM_FLAG_MAP[clientKey] || clientKey;
}

export function getClientFlagName(platformKey: string): string {
  return PLATFORM_TO_CLIENT_FLAG_MAP[platformKey] || platformKey;
}

function getCacheKey(flagName: string, environment: string, tenantId: string): string {
  return `${CACHE_KEY_PREFIX}${flagName}:${environment}:${tenantId}`;
}

export class FeatureFlagService {
  /**
   * Check if a feature flag is enabled (cache-first)
   */
  async isEnabled(flagName: string, tenantId: string): Promise<boolean> {
    const cacheKey = getCacheKey(flagName, PLATFORM_ENV, tenantId);

    try {
      const valkey = getValkeyClient();
      const cached = await valkey.get(cacheKey);

      if (cached !== null) {
        logger.debug({ flagName, environment: PLATFORM_ENV, tenantId, cached: true }, 'Feature flag cache hit');
        return cached === 'true';
      }

      const response = await axios.get(
        `${PLATFORM_FLAGS_URL}/api/features/is-enabled/${flagName}/${PLATFORM_ENV}/${tenantId}`
      );

      const isEnabled = response.data;
      console.log(`Is Enabled: ${isEnabled}`);
      const boolValue = Boolean(isEnabled);

      await valkey.setex(cacheKey, CACHE_TTL_SECONDS, String(boolValue));

      logger.debug(
        { flagName, environment: PLATFORM_ENV, tenantId, isEnabled: boolValue, cached: false },
        'Feature flag fetched from platform'
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
        'Feature flag fetch error'
      );
      return false;
    }
  }


  async getFlags(flagNames: string[], tenantId: string): Promise<Record<string, boolean>> {
    const results = await Promise.allSettled(
      flagNames.map(async (name) => ({
        name,
        value: await this.isEnabled(name, tenantId),
      }))
    );

    return results.reduce(
      (acc, result) => {
        if (result.status === 'fulfilled') {
          acc[result.value.name] = result.value.value;
        }
        return acc;
      },
      {} as Record<string, boolean>
    );
  }

  /**
   * Update a feature flag rule
   * Invalidates cache and broadcasts SSE update
   */
  async updateRule(
    flagName: string,
    isEnabled: boolean,
    organizationId: string
  ): Promise<boolean> {
    try {
      await axios.post(`${PLATFORM_FLAGS_URL}/api/features/${flagName}/rules`, {
        environment: PLATFORM_ENV,
        tenant: organizationId,
        isEnabled: isEnabled,
      });

      // Invalidate cache
      await this.invalidateCache(flagName, organizationId);

      // Broadcast SSE update
      this.broadcastFlagUpdate(flagName, isEnabled, organizationId);

      logger.info({ flagName, environment: PLATFORM_ENV, organizationId, isEnabled }, 'Feature flag updated');

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
        'Feature flag update error'
      );
      return false;
    }
  }

  /**
   * Invalidate cache for a specific flag
   */
  private async invalidateCache(flagName: string, tenantId: string): Promise<void> {
    const cacheKey = getCacheKey(flagName, PLATFORM_ENV, tenantId);
    const valkey = getValkeyClient();
    await valkey.del(cacheKey);
    logger.debug({ cacheKey }, 'Feature flag cache invalidated');
  }

  /**
   * Broadcast flag update via SSE to all users in organization
   */
  private broadcastFlagUpdate(flagName: string, isEnabled: boolean, organizationId: string): void {
    const sseService = getSSEService();
    const clientFlagName = getClientFlagName(flagName);

    sseService.sendToOrganization(organizationId, {
      type: 'feature_flag_update',
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
