/**
 * Valkey (Redis) client configuration
 *
 * Used for retrieving iframe workflow payloads stored by host applications.
 */

import Redis from 'ioredis';
import { logger } from './logger.js';

let valkeyClient: Redis | null = null;

export function getValkeyClient(): Redis {
  if (!valkeyClient) {
    const url = process.env.VALKEY_URL || process.env.REDIS_URL || 'redis://localhost:6379';

    valkeyClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error({ times }, 'Valkey connection failed after max retries');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000); // Exponential backoff
      },
      lazyConnect: true, // Don't connect until first command
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
