import { describe, expect, it } from "bun:test";

import { buildCalendarIcs } from "@/lib/calendar";

import {
  buildFeedCalendarName,
  buildPersonalFeedItems,
  type FeedEventRow,
} from "../lib/personal-feed";

const appBaseUrl = "https://app.openministry.online";

function makeEvent(overrides: Partial<FeedEventRow> = {}): FeedEventRow {
  return {
    id: "event-1",
    title: "Culto de Domingo",
    kind: "service",
    description: null,
    location: "Templo Principal",
    startsAt: new Date("2026-11-22T13:00:00.000Z"),
    endsAt: new Date("2026-11-22T15:00:00.000Z"),
    updatedAt: new Date("2026-11-19T12:00:00.000Z"),
    ...overrides,
  };
}

describe("personal calendar feed items", () => {
  it("destaca o evento em que o membro está escalado", () => {
    const [item] = buildPersonalFeedItems({
      events: [makeEvent()],
      assignmentsByEventId: new Map([["event-1", ["Louvor — Vocal"]]]),
      appBaseUrl,
    });

    expect(item.title).toBe("Escala: Culto de Domingo");
    expect(item.type).toBe("assignment");
    expect(item.description).toContain("Escala: Louvor — Vocal");
    expect(item.description).toContain(
      "https://app.openministry.online/events/event-1",
    );
    expect(item.metadata?.isMyAssignment).toBe(true);
  });

  it("mantém o título original quando não há escala", () => {
    const [item] = buildPersonalFeedItems({
      events: [makeEvent()],
      assignmentsByEventId: new Map(),
      appBaseUrl,
    });

    expect(item.title).toBe("Culto de Domingo");
    expect(item.type).toBe("event");
    expect(item.metadata?.isMyAssignment).toBe(false);
  });

  it("usa apenas as funções do próprio membro e evita duplicatas", () => {
    const [item] = buildPersonalFeedItems({
      events: [makeEvent()],
      assignmentsByEventId: new Map([
        ["event-1", ["Louvor — Vocal", "Louvor — Vocal", "Louvor — Violão"]],
      ]),
      appBaseUrl,
    });

    expect(item.description).toContain("Louvor — Vocal · Louvor — Violão");
  });

  it("deriva SEQUENCE e LAST-MODIFIED da última alteração", () => {
    const [item] = buildPersonalFeedItems({
      events: [makeEvent()],
      assignmentsByEventId: new Map(),
      appBaseUrl,
    });

    expect(item.lastModified).toBe("2026-11-19T12:00:00.000Z");
    expect(item.sequence).toBe(
      Math.floor(new Date("2026-11-19T12:00:00.000Z").getTime() / 1000),
    );
  });

  it("não coloca descrição vazia nem barra duplicada no link", () => {
    const [item] = buildPersonalFeedItems({
      events: [makeEvent({ description: "   " })],
      assignmentsByEventId: new Map(),
      appBaseUrl: `${appBaseUrl}/`,
    });

    expect(item.description).toBe(
      "https://app.openministry.online/events/event-1",
    );
  });
});

describe("personal calendar feed ICS", () => {
  it("gera VEVENT estável com status, sequência e UID por evento", () => {
    const items = buildPersonalFeedItems({
      events: [makeEvent()],
      assignmentsByEventId: new Map([["event-1", ["Louvor — Vocal"]]]),
      appBaseUrl,
    });

    const ics = buildCalendarIcs(items, {
      timeZone: "America/Sao_Paulo",
      calendarName: buildFeedCalendarName("Ana"),
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("X-WR-CALNAME:OpenMinistry — Ana");
    expect(ics).toContain("UID:event-event-1@openministry");
    expect(ics).toContain("DTSTART:20261122T130000Z");
    expect(ics).toContain("DTEND:20261122T150000Z");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("SEQUENCE:");
    expect(ics).toContain("LAST-MODIFIED:20261119T120000Z");
    expect(ics).toContain("SUMMARY:Escala: Culto de Domingo");
    expect(ics).toContain("LOCATION:Templo Principal");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("dobra linhas longas por octeto, sem quebrar acento no meio", () => {
    const longTitle = "Ação de Graças e Adoração ".repeat(6).trim();
    const items = buildPersonalFeedItems({
      events: [makeEvent({ title: longTitle, location: null })],
      assignmentsByEventId: new Map(),
      appBaseUrl,
    });

    const ics = buildCalendarIcs(items, { timeZone: "America/Sao_Paulo" });

    for (const line of ics.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(ics).not.toContain("\uFFFD");
    expect(ics.replace(/\r\n /g, "")).toContain(longTitle);
  });
});

describe("calendar feed name", () => {
  it("usa o nome do membro e cai no padrão quando vazio", () => {
    expect(buildFeedCalendarName("  Ana  ")).toBe("OpenMinistry — Ana");
    expect(buildFeedCalendarName("   ")).toBe("OpenMinistry — Minha agenda");
  });
});
