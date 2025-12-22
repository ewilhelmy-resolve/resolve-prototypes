/**
 * Valkey (Redis) client configuration
 *
 * Used for retrieving iframe workflow payloads stored by host applications.
 */

import Redis from 'ioredis';
import { logger } from './logger.js';

let valkeyClient: Redis | null = null;
let valkeyUrl: string | null = null;

/**
 * Get masked Valkey URL for debugging (hides password)
 */
export function getValkeyUrlMasked(): string {
  if (!valkeyUrl) return 'not configured';
  return valkeyUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

/**
 * Get Valkey connection status
 */
export function getValkeyStatus(): { configured: boolean; url: string; connected: boolean } {
  return {
    configured: !!valkeyUrl,
    url: getValkeyUrlMasked(),
    connected: valkeyClient?.status === 'ready',
  };
}

export function getValkeyClient(): Redis {
  if (!valkeyClient) {
    let url = process.env.VALKEY_URL || process.env.REDIS_URL;
    if (!url) {
      throw new Error('VALKEY_URL or REDIS_URL must be set');
    }

    // Auto-add rediss:// prefix if missing (required for TLS)
    if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
      url = `rediss://${url}`;
      logger.info('Added rediss:// prefix to Valkey URL for TLS');
    }

    // Store URL for status checking
    valkeyUrl = url;

    // Mask URL for logging (show host only)
    const maskedUrl = url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    logger.info({ url: maskedUrl }, 'Initializing Valkey client');

    // Extract hostname for TLS servername (required for AWS/managed providers)
    const hostname = new URL(url).hostname;

    valkeyClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      commandTimeout: 5000,
      lazyConnect: true,
      tls: {
        servername: hostname,
      },
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error({ times }, 'Valkey connection failed after max retries');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        logger.warn({ attempt: times, nextRetryMs: delay }, 'Valkey connection retry');
        return delay;
      },
    });

    valkeyClient.on('connect', () => {
      logger.info('Valkey client connected');
    });

    valkeyClient.on('error', (err) => {
      logger.error({ error: err.message }, 'Valkey client error');
    });

    valkeyClient.on('close', () => {
      logger.info('Valkey client connection closed');
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
    logger.info('Valkey client disconnected');
  }
}
