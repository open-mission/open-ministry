import "server-only";

import type { Redis } from "@upstash/redis";

/**
 * Storage de rate limit do Better Auth no Redis Upstash (opção "a").
 *
 * Usa `rateLimit.customStorage`: o runtime do better-auth 1.7 chama
 * `consume(key, rule)` esperando `{ allowed, retryAfter }` (em segundos).
 * Essa é a assinatura de `BetterAuthRateLimitStorage` na cópia de
 * @better-auth/core que o pacote better-auth resolve — o objeto é passado
 * direto, sem cast. (A cópia de @better-auth/core no root do monorepo declara
 * um `get/set` defasado, mas não é a que o `betterAuth()` usa.)
 *
 * Semântica: janela fixa iniciada no primeiro request (INCR + EXPIRE NX).
 * Fail-open quando o Redis não está configurado ou está indisponível: o rate
 * limit nunca deve derrubar o login da igreja inteira.
 */
export type RateLimitRule = { window: number; max: number };

export type RateLimitDecision = { allowed: boolean; retryAfter: number | null };

export type BetterAuthConsumeStorage = {
  consume(key: string, rule: RateLimitRule): Promise<RateLimitDecision>;
};

export function createRedisRateLimitStorage(
  redis: Redis | null,
): BetterAuthConsumeStorage {
  return {
    async consume(key, rule) {
      if (!redis) {
        return { allowed: true, retryAfter: null };
      }

      try {
        const [count] = await redis
          .multi()
          .incr(key)
          .expire(key, rule.window, "NX")
          .exec();
        const attempts = Number(count ?? 1);

        if (attempts <= rule.max) {
          return { allowed: true, retryAfter: null };
        }

        return { allowed: false, retryAfter: rule.window };
      } catch (error) {
        console.warn(
          "[rate-limit] Redis indisponível; liberando request (fail-open):",
          error,
        );
        return { allowed: true, retryAfter: null };
      }
    },
  };
}
