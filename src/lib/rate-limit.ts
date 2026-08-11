import { NextRequest } from "next/server";

/**
 * A simple in-memory fixed-window rate limiter.
 *
 * This is per-instance, not distributed: on Vercel each serverless
 * instance has its own counter, so the effective limit is
 * `limit * (number of warm instances)` rather than a hard global cap.
 * That's a real limitation for a determined attacker, but it still
 * stops casual abuse/scripted spam without adding a paid Redis
 * dependency, which is the right tradeoff for a $0/month MVP. If this
 * app outgrows that, swap this for Upstash Redis (has a free tier) or
 * Vercel's own rate limiting — nothing else in the codebase needs to
 * change since every call site goes through `rateLimit()` below.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so this map can't grow unbounded
// across a long-lived warm instance.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return { success: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Best-effort client identifier — trusts Vercel's forwarded-for header. */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

export function rateLimitResponseInit(result: RateLimitResult) {
  return {
    status: 429,
    headers: {
      "Retry-After": Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)).toString(),
    },
  };
}
