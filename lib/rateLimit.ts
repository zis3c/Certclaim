import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();
let redisClient: Redis | null | undefined;

function cleanup(now: number) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function getRedisClient() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { message: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds)
      }
    }
  );
}

function memoryRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  cleanup(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;
  if (current.count <= limit) {
    return null;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return rateLimitResponse(retryAfterSeconds);
}

async function redisRateLimit(
  redis: Redis,
  { key, limit, windowMs }: RateLimitOptions
) {
  const now = Date.now();
  const windowId = Math.floor(now / windowMs);
  const redisKey = `rate-limit:${key}:${windowId}`;
  const expiresInSeconds = Math.max(1, Math.ceil(windowMs / 1000) + 5);

  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, expiresInSeconds);
  }

  if (count <= limit) {
    return null;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(((windowId + 1) * windowMs - now) / 1000)
  );
  return rateLimitResponse(retryAfterSeconds);
}

export async function rateLimit(options: RateLimitOptions) {
  const redis = getRedisClient();
  if (!redis) {
    return memoryRateLimit(options);
  }

  try {
    return await redisRateLimit(redis, options);
  } catch (error) {
    console.error("Redis rate limit failed; using in-memory fallback.", error);
    return memoryRateLimit(options);
  }
}
