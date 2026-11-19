import { describe, expect, it } from "bun:test";

import {
  generateFeedToken,
  hashFeedToken,
  isPlausibleFeedToken,
} from "../lib/feed-token";
import { buildCalendarFeedUrls } from "../lib/feed-url";

describe("calendar feed token", () => {
  it("gera tokens longos, únicos e seguros para URL", () => {
    const first = generateFeedToken();
    const second = generateFeedToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("guarda apenas um hash determinístico e irreversível", () => {
    const token = generateFeedToken();
    const hash = hashFeedToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashFeedToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
  });

  it("rejeita tokens com formato inválido sem consultar o banco", () => {
    expect(isPlausibleFeedToken(null)).toBe(false);
    expect(isPlausibleFeedToken(undefined)).toBe(false);
    expect(isPlausibleFeedToken("curto")).toBe(false);
    expect(isPlausibleFeedToken("a".repeat(31))).toBe(false);
    expect(isPlausibleFeedToken(`${"a".repeat(42)}!`)).toBe(false);
    expect(isPlausibleFeedToken("a".repeat(32))).toBe(true);
  });
});

describe("calendar feed urls", () => {
  it("monta a URL https e a versão webcal sem barra duplicada", () => {
    const urls = buildCalendarFeedUrls("token-123", "https://app.openministry.online/");

    expect(urls.url).toBe(
      "https://app.openministry.online/api/calendar/feed/token-123",
    );
    expect(urls.webcalUrl).toBe(
      "webcal://app.openministry.online/api/calendar/feed/token-123",
    );
  });
});
