import { describe, expect, it, mock } from "bun:test";

import type { RateLimitDecision, RateLimitRule } from "../rate-limit";
import {
  checkRateLimit,
  extractClientIp,
  RATE_LIMIT_RULES,
  rateLimitHeaders,
} from "../rate-limit";

describe("extractClientIp", () => {
  it("usa o primeiro IP válido do x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    });
    expect(extractClientIp(headers)).toBe("203.0.113.7");
  });

  it("prefere o IP do provedor quando presente", () => {
    const headers = new Headers({
      "cf-connecting-ip": "198.51.100.4",
      "x-forwarded-for": "203.0.113.7",
    });
    expect(extractClientIp(headers)).toBe("198.51.100.4");
  });

  it("normaliza IPv6 entre colchetes", () => {
    const headers = new Headers({ "x-real-ip": "[2001:DB8::1]" });
    expect(extractClientIp(headers)).toBe("2001:db8::1");
  });

  it("nunca confia em cabeçalho inválido ou longo demais", () => {
    expect(extractClientIp(new Headers({ "x-forwarded-for": "não é ip" }))).toBe(
      "unknown",
    );
    expect(
      extractClientIp(new Headers({ "x-real-ip": "a".repeat(300) })),
    ).toBe("unknown");
    expect(extractClientIp(new Headers())).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  const rule: RateLimitRule = { window: 60, max: 5 };

  it("usa o storage injetado com prefixo de chave estável", async () => {
    const keys: string[] = [];
    const consume = mock(async (key: string, passedRule: RateLimitRule) => {
      keys.push(key);
      expect(passedRule).toBe(rule);
      return { allowed: false, retryAfter: 30 } as RateLimitDecision;
    });

    const decision = await checkRateLimit("feed:ip", rule, { consume });

    expect(decision).toEqual({ allowed: false, retryAfter: 30 });
    expect(keys).toEqual(["ratelimit:feed:ip"]);
  });

  it("falha aberta quando o storage lança erro", async () => {
    const consume = mock(async () => {
      throw new Error("redis indisponível");
    });

    const decision = await checkRateLimit("feed:ip", rule, { consume });

    expect(decision).toEqual({ allowed: true, retryAfter: null });
  });

  it("expõe Retry-After e no-store quando bloqueado", () => {
    expect(rateLimitHeaders({ allowed: false, retryAfter: 12 })).toEqual({
      "cache-control": "no-store",
      "retry-after": "12",
    });
    expect(rateLimitHeaders({ allowed: true, retryAfter: null })).toEqual({
      "cache-control": "no-store",
    });
  });

  it("mantém as regras centralizadas e conservadoras", () => {
    expect(RATE_LIMIT_RULES).toEqual({
      evolutionWebhook: { window: 60, max: 240 },
      calendarFeed: { window: 60, max: 60 },
      announcement: { window: 300, max: 5 },
      emailDispatch: { window: 60, max: 15 },
      churchWhatsApp: { window: 60, max: 10 },
    });
  });
});
