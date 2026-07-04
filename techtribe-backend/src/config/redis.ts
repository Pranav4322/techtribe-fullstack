import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 200, 3000)
});

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));

/** Get a JSON value from cache, or null if missing/invalid. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Set a JSON value in cache with a TTL in seconds. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDel(key: string | string[]): Promise<void> {
  const keys = Array.isArray(key) ? key : [key];
  if (keys.length) await redis.del(...keys);
}

/** Delete all keys matching a pattern (uses SCAN to avoid blocking). */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const stream = redis.scanStream({ match: pattern, count: 100 });
  const pipeline = redis.pipeline();
  let found = 0;
  for await (const keys of stream) {
    if (keys.length) {
      found += keys.length;
      keys.forEach((k: string) => pipeline.del(k));
    }
  }
  if (found) await pipeline.exec();
}

export async function disconnectRedis() {
  await redis.quit();
}
