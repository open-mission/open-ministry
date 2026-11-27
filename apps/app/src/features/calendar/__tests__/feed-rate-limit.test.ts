import { beforeEach, describe, expect, it, mock } from "bun:test";
import * as nextServer from "next/server";

mock.module("next/server", () => ({
  ...nextServer,
  connection: async () => undefined,
}));

let allowed = true;
let feed: { ics: string; fileName: string } | null = {
  ics: "BEGIN:VCALENDAR\r\nEND:VCALENDAR",
  fileName: "calendario.ics",
};
let loadCalls = 0;

mock.module("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({
    allowed,
    retryAfter: allowed ? null : 45,
  }),
  extractClientIp: () => "203.0.113.9",
  rateLimitHeaders: () => ({
    "cache-control": "no-store",
    "retry-after": "45",
  }),
  RATE_LIMIT_RULES: {},
}));

mock.module("@/features/calendar/services/personal-feed", () => ({
  loadPersonalCalendarFeed: async () => {
    loadCalls++;
    return feed;
  },
}));

const { GET } = await import("@/app/api/calendar/feed/[token]/route");

function request(): Request {
  return new Request("https://app.test/api/calendar/feed/token-123");
}

function context() {
  return { params: Promise.resolve({ token: "token-123" }) };
}

beforeEach(() => {
  allowed = true;
  loadCalls = 0;
  feed = { ics: "BEGIN:VCALENDAR\r\nEND:VCALENDAR", fileName: "calendario.ics" };
});

describe("GET /api/calendar/feed/[token]", () => {
  it("responde 429 com Retry-After e sem cache antes de consultar o banco", async () => {
    allowed = false;

    const response = await GET(request() as never, context());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(loadCalls).toBe(0);
  });

  it("mantém 404 opaco para token desconhecido quando o limite permite", async () => {
    feed = null;

    const response = await GET(request() as never, context());

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(loadCalls).toBe(1);
  });
});
