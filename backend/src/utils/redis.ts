import Redis from 'ioredis';
import { RedisStore } from 'rate-limit-redis';

let redisClient: Redis | null = null;
let isConnected = false;

const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
      connectTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 5) {
          console.warn('[Redis] Max reconnection attempts reached. Continuing in memory-fallback mode.');
          return null; // Stop reconnecting after 5 attempts
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('✅ Distributed Redis Rate-Limit Store Connected successfully.');
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // Log as non-fatal warning so application never crashes if Redis blips
      console.warn(`⚠️ [Redis Warning] Connection error (${err.message}). Rate limiters will fail-open / use memory fallback.`);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });
  } catch (err: any) {
    console.warn('[Redis] Failed to initialize Redis client:', err?.message || err);
    redisClient = null;
  }
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ [Production Notice] REDIS_URL not configured. Rate limiting is running on single-instance in-memory store.');
  }
}

/**
 * Returns the active Redis client instance, or null if not configured.
 */
export const getRedisClient = (): Redis | null => redisClient;

/**
 * Returns true if Redis is configured, connected, and ready to accept commands.
 */
export const isRedisAvailable = (): boolean => isConnected && redisClient !== null && redisClient.status === 'ready';

/**
 * Creates a distributed RedisStore for express-rate-limit if Redis is configured,
 * otherwise returns undefined to allow express-rate-limit to seamlessly use its built-in MemoryStore.
 */
export const createRateLimitStore = (prefix: string, customClient?: any): RedisStore | undefined => {
  const client = customClient || redisClient;
  if (!client) {
    return undefined;
  }

  try {
    return new RedisStore({
      sendCommand: (...args: string[]) => client.call(...args),
      prefix: `rl:${prefix}:`,
    });
  } catch (err) {
    console.warn(`[RedisStore] Error creating store for prefix "${prefix}", falling back to memory store:`, err);
    return undefined;
  }
};

/**
 * Gracefully disconnects Redis client upon process termination.
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    } finally {
      isConnected = false;
      redisClient = null;
    }
  }
};
