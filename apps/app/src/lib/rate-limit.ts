import "server-only";

import { isIP } from "node:net";

import { getRedisClient } from "@/lib/queue";
import {
  createRedisRateLimitStorage,
  type RateLimitDecision,
  type RateLimitRule,
} from "@/lib/rate-limit-storage";

export type { RateLimitDecision, RateLimitRule } from "@/lib/rate-limit-storage";

/** Fixed-window rules (window in seconds). Redis is fail-open by design. */
export const RATE_LIMIT_RULES = {
  evolutionWebhook: { window: 60, max: 240 },
  calendarFeed: { window: 60, max: 60 },
  announcement: { window: 300, max: 5 },
  emailDispatch: { window: 60, max: 15 },
  churchWhatsApp: { window: 60, max: 10 },
} as const satisfies Record<string, RateLimitRule>;

type RateLimitDeps = {
  /** Injectable for tests; production uses the shared Upstash storage. */
  consume?: (key: string, rule: RateLimitRule) => Promise<RateLimitDecision>;
};

function normalizeIp(raw: string | null): string | null {
  if (!raw || raw.length > 256) return null;

  for (const part of raw.split(",")) {
    const candidate = part.trim().replace(/^\[|\]$/g, "");
    if (candidate.length > 45) continue;

    const version = isIP(candidate);
    if (version === 6) return candidate.toLowerCase();
    if (version === 4) return candidate;
  }

  return null;
}

/**
 * Never trusts arbitrary header content as a cache key: only valid IPs are
 * accepted, and the first trusted hop wins. Missing/invalid headers collapse
 * to a single "unknown" bucket.
 */
export function extractClientIp(headers: Headers): string {
  return (
    normalizeIp(headers.get("cf-connecting-ip")) ??
    normalizeIp(headers.get("x-real-ip")) ??
    normalizeIp(headers.get("x-forwarded-for")) ??
    "unknown"
  );
}

export async function checkRateLimit(
  key: string,
  rule: RateLimitRule,
  deps?: RateLimitDeps,
): Promise<RateLimitDecision> {
  const consume =
    deps?.consume ?? createRedisRateLimitStorage(getRedisClient()).consume;

  try {
    return await consume(`ratelimit:${key}`, rule);
  } catch (error) {
    console.warn(
      "[rate-limit] Falha ao verificar limite; liberando request (fail-open):",
      error,
    );
    return { allowed: true, retryAfter: null };
  }
}

export function rateLimitHeaders(
  decision: RateLimitDecision,
): Record<string, string> {
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (decision.retryAfter !== null) {
    headers["retry-after"] = String(decision.retryAfter);
  }
  return headers;
}
