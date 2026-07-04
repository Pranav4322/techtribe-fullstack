import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request } from 'express';
import { redis } from '../config/redis';
import { env } from '../config/env';

function redisStore(prefix: string) {
  return new RedisStore({
    // @ts-expect-error — ioredis call signature is compatible at runtime
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix
  });
}

/** General-purpose API rate limiter. */
export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:general:'),
  message: { success: false, message: 'Too many requests, please try again later.' }
});

/** Stricter limiter for auth endpoints (login/register/reset) to slow brute force. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:auth:'),
  message: { success: false, message: 'Too many attempts, please try again later.' }
});

/** Per-user daily limiter for expensive AI calls. */
export const aiRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: env.AI_RATE_LIMIT_MAX_PER_DAY,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:ai:'),
  keyGenerator: (req: Request) => req.user?.id || req.ip || 'anonymous',
  message: { success: false, message: 'Daily AI usage limit reached. Please try again tomorrow.' }
});
