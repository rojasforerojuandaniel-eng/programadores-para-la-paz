import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();
const limiterCache = new Map<string, Ratelimit>();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

function buildLimiter(maxRequests: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;

  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));
  const cacheKey = `${maxRequests}:${windowSeconds}`;

  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds}s`),
    prefix: `rhynode:rl:${maxRequests}:${windowSeconds}`,
    ephemeralCache: false,
    analytics: false,
  });

  limiterCache.set(cacheKey, limiter);
  return limiter;
}

function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export async function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const limiter = buildLimiter(maxRequests, windowMs);

  if (limiter) {
    try {
      const result = await limiter.limit(key);
      const resetAt =
        typeof result.reset === "number" ? result.reset : Date.now() + windowMs;

      return {
        success: result.success,
        limit: result.limit ?? maxRequests,
        remaining: Math.max(0, result.remaining ?? 0),
        resetAt,
      };
    } catch (error) {
      logger.warn("Redis rate limit failed; falling back to memory", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return memoryRateLimit(key, maxRequests, windowMs);
}

export const ratelimit = rateLimit;

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
