import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { generatePublicShareToken, isPublicShareExpired } = await import(
  "@/lib/public-share"
);

const DAY_MS = 24 * 60 * 60 * 1000;

describe("generatePublicShareToken", () => {
  it("gera 43 caracteres base64url (256 bits de entropia)", () => {
    const token = generatePublicShareToken();

    expect(token.length).toBe(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("gera tokens distintos a cada chamada", () => {
    expect(generatePublicShareToken()).not.toBe(generatePublicShareToken());
  });
});

describe("isPublicShareExpired", () => {
  const savedNow = Date.now;

  afterEach(() => {
    Date.now = savedNow;
  });

  function freezeNow() {
    const now = new Date("2026-11-12T12:00:00.000Z").getTime();
    Date.now = () => now;
    return now;
  }

  it("token atualizado dentro da janela não expira", () => {
    freezeNow();

    expect(isPublicShareExpired(new Date(Date.now() - 364 * DAY_MS))).toBe(
      false,
    );
  });

  it("token atualizado há mais de 365 dias expira", () => {
    freezeNow();

    expect(isPublicShareExpired(new Date(Date.now() - 366 * DAY_MS))).toBe(
      true,
    );
  });

  it("linha legada sem timestamp não expira", () => {
    freezeNow();

    expect(isPublicShareExpired(null)).toBe(false);
    expect(isPublicShareExpired(undefined)).toBe(false);
  });
});
