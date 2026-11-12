import { describe, expect, it, mock } from "bun:test";

import type { Redis } from "@upstash/redis";

mock.module("server-only", () => ({}));

const { createRedisRateLimitStorage } = await import(
  "@/lib/rate-limit-storage"
);

function fakeRedis(options?: {
  incrResult?: number | Error;
  throwOnExec?: boolean;
}): { calls: unknown[][] } & Redis {
  const calls: unknown[][] = [];
  const api = {
    incr: (...args: unknown[]) => {
      calls.push(["incr", ...args]);
      return api;
    },
    expire: (...args: unknown[]) => {
      calls.push(["expire", ...args]);
      return api;
    },
    exec: async (): Promise<unknown[]> => {
      if (options?.throwOnExec) {
        throw new Error("redis down");
      }
      const incr = options?.incrResult ?? 1;
      if (incr instanceof Error) {
        throw incr;
      }
      return [incr, 1];
    },
  };
  return {
    calls,
    multi: () => api,
  } as unknown as { calls: unknown[][] } & Redis;
}

const rule = { window: 60, max: 10 };

describe("createRedisRateLimitStorage", () => {
  it("allows the request while the counter is within max", async () => {
    const storage = createRedisRateLimitStorage(fakeRedis({ incrResult: 10 }));

    const decision = await storage.consume("rl:/sign-in/email:1.2.3.4", rule);

    expect(decision).toEqual({ allowed: true, retryAfter: null });
  });

  it("blocks the request with retryAfter when the counter exceeds max", async () => {
    const storage = createRedisRateLimitStorage(fakeRedis({ incrResult: 11 }));

    const decision = await storage.consume("rl:/sign-in/email:1.2.3.4", rule);

    expect(decision).toEqual({ allowed: false, retryAfter: 60 });
  });

  it("starts the fixed window from the first request with EXPIRE NX", async () => {
    const redis = fakeRedis({ incrResult: 1 });
    const storage = createRedisRateLimitStorage(redis);

    await storage.consume("rl:/sign-in/email:1.2.3.4", rule);

    expect(redis.calls[0]).toEqual(["incr", "rl:/sign-in/email:1.2.3.4"]);
    expect(redis.calls[1]).toEqual([
      "expire",
      "rl:/sign-in/email:1.2.3.4",
      60,
      "NX",
    ]);
  });

  it("fails open when there is no Redis client", async () => {
    const storage = createRedisRateLimitStorage(null);

    const decision = await storage.consume("rl:key", rule);

    expect(decision).toEqual({ allowed: true, retryAfter: null });
  });

  it("fails open when Redis is unavailable", async () => {
    const storage = createRedisRateLimitStorage(fakeRedis({ throwOnExec: true }));

    const decision = await storage.consume("rl:key", rule);

    expect(decision).toEqual({ allowed: true, retryAfter: null });
  });
});
