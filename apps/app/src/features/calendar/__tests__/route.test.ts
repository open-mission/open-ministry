import { beforeEach, describe, expect, it, mock } from "bun:test";
import * as nextServer from "next/server";

mock.module("next/server", () => ({
  ...nextServer,
  connection: async () => undefined,
}));

type LoadedFeed = {
  feedId: string;
  organizationId: string;
  personId: string;
  ics: string;
  fileName: string;
};

let mockFeed: LoadedFeed | null = null;
let mockError: Error | null = null;

mock.module("@/features/calendar/services/personal-feed", () => ({
  loadPersonalCalendarFeed: async () => {
    if (mockError) throw mockError;
    return mockFeed;
  },
}));

const { GET } = await import("@/app/api/calendar/feed/[token]/route");

const validIcs = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//OpenMinistry//Agenda//PT-BR",
  "BEGIN:VEVENT",
  "UID:event-1@openministry",
  "SUMMARY:Escala: Culto",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("https://app.openministry.online/api/calendar/feed/token", {
    headers,
  }) as Parameters<typeof GET>[0];
}

const context = { params: Promise.resolve({ token: "a".repeat(43) }) };

beforeEach(() => {
  mockError = null;
  mockFeed = {
    feedId: "feed-1",
    organizationId: "org-1",
    personId: "person-1",
    ics: validIcs,
    fileName: "openministry.ics",
  };
});

describe("GET /api/calendar/feed/[token]", () => {
  it("devolve o ICS com ETag e sem liberar cache público", async () => {
    const response = await GET(makeRequest(), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toContain(
      "openministry.ics",
    );
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("etag")).toMatch(/^"[a-f0-9]{64}"$/);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(await response.text()).toBe(validIcs);
  });

  it("responde 304 quando o cliente repete o ETag atual", async () => {
    const first = await GET(makeRequest(), context);
    const etag = first.headers.get("etag") ?? "";

    const second = await GET(makeRequest({ "if-none-match": etag }), context);

    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
  });

  it("responde 404 para token desconhecido ou revogado", async () => {
    mockFeed = null;

    const response = await GET(makeRequest(), context);

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toContain("não encontrado");
  });

  it("responde 500 sem vazar detalhes do erro", async () => {
    mockError = new Error("DATABASE_URL leaked here");

    const response = await GET(makeRequest(), context);

    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain("Não foi possível gerar o calendário");
    expect(body).not.toContain("DATABASE_URL");
  });
});
