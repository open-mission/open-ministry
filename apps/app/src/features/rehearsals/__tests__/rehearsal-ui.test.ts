import { describe, expect, it } from "bun:test";

import {
  buildRehearsalPayload,
  describeOffsetMinutes,
  formatAlertRuleSummary,
  getChannelLabel,
  getTriggerLabel,
  rehearsalSongCountLabel,
  splitRehearsals,
  toRehearsalFormValues,
  type RehearsalFormValues,
} from "@/features/rehearsals/lib/rehearsal-ui";

const baseForm: RehearsalFormValues = {
  title: "  Ensaio do louvor  ",
  description: "  Conferir arranjos  ",
  location: "  Templo principal  ",
  date: "2026-11-20",
  startTime: "19:30",
  endTime: "21:00",
  notifyImmediately: false,
  songs: [
    { songId: "song-1", musicalKey: "  G  ", notes: "  Entrar direto  " },
    { songId: "song-2", musicalKey: "", notes: "" },
    { songId: "song-1", musicalKey: "A" },
  ],
};

describe("Rehearsal UI helpers", () => {
  it("builds a UTC payload from America/Sao_Paulo wall-clock time", () => {
    const payload = buildRehearsalPayload(baseForm);

    // 20/11/2026 19:30 em São Paulo (UTC-3) = 22:30Z
    expect(payload.startsAt).toBe("2026-11-20T22:30:00.000Z");
    expect(payload.endsAt).toBe("2026-11-21T00:00:00.000Z");
    expect(payload.durationMinutes).toBe(90);
    expect(payload.notifyImmediately).toBe(false);
  });

  it("trims fields and de-duplicates songs preserving order", () => {
    const payload = buildRehearsalPayload(baseForm);

    expect(payload.title).toBe("Ensaio do louvor");
    expect(payload.description).toBe("Conferir arranjos");
    expect(payload.location).toBe("Templo principal");
    expect(payload.songs).toEqual([
      { songId: "song-1", musicalKey: "G", notes: "Entrar direto" },
      { songId: "song-2" },
    ]);
  });

  it("drops empty optional fields instead of sending empty strings", () => {
    const payload = buildRehearsalPayload({
      ...baseForm,
      description: "   ",
      location: "   ",
      notifyImmediately: true,
    });

    expect(payload.description).toBeNull();
    expect(payload.location).toBeNull();
    expect(payload.notifyImmediately).toBe(true);
  });

  it("handles an end time that crosses midnight", () => {
    const payload = buildRehearsalPayload({
      ...baseForm,
      startTime: "22:00",
      endTime: "00:30",
    });

    expect(payload.startsAt).toBe("2026-11-21T01:00:00.000Z");
    expect(payload.endsAt).toBe("2026-11-21T03:30:00.000Z");
    expect(payload.durationMinutes).toBe(150);
  });

  it("rejects an invalid date", () => {
    expect(() =>
      buildRehearsalPayload({ ...baseForm, date: "20/11/2026" }),
    ).toThrow("Informe a data do ensaio.");
  });

  it("rejects a missing title", () => {
    expect(() =>
      buildRehearsalPayload({ ...baseForm, title: "   " }),
    ).toThrow("Informe o título do ensaio.");
  });

  it("fills the edit form in the church timezone", () => {
    const values = toRehearsalFormValues({
      title: "Ensaio",
      description: null,
      location: null,
      startsAt: new Date("2026-11-20T22:30:00.000Z"),
      endsAt: new Date("2026-11-21T00:00:00.000Z"),
      songs: [{ songId: "song-1", musicalKey: "G", notes: null }],
    });

    expect(values.date).toBe("2026-11-20");
    expect(values.startTime).toBe("19:30");
    expect(values.endTime).toBe("21:00");
    expect(values.description).toBe("");
    expect(values.location).toBe("");
    expect(values.notifyImmediately).toBe(false);
    expect(values.songs).toEqual([
      { songId: "song-1", musicalKey: "G", notes: null },
    ]);
  });

  it("splits upcoming and past rehearsals", () => {
    const now = new Date("2026-11-17T12:00:00.000Z");
    const { upcoming, past } = splitRehearsals(
      [
        {
          id: "past",
          startsAt: new Date("2026-11-10T22:00:00.000Z"),
          endsAt: new Date("2026-11-10T23:30:00.000Z"),
        },
        {
          id: "later",
          startsAt: new Date("2026-11-20T22:00:00.000Z"),
          endsAt: new Date("2026-11-20T23:30:00.000Z"),
        },
        {
          id: "sooner",
          startsAt: new Date("2026-11-18T22:00:00.000Z"),
          endsAt: new Date("2026-11-18T23:30:00.000Z"),
        },
      ],
      now,
    );

    expect(upcoming.map((item) => item.id)).toEqual(["sooner", "later"]);
    expect(past.map((item) => item.id)).toEqual(["past"]);
  });

  it("formats channel and trigger labels", () => {
    expect(getChannelLabel("in_app")).toBe("No app");
    expect(getChannelLabel("whatsapp")).toBe("WhatsApp");
    expect(getChannelLabel("unknown")).toBe("unknown");
    expect(getTriggerLabel("offset_minutes")).toBe("Antes do ensaio");
    expect(getTriggerLabel("day_of_at_time")).toBe("No dia do ensaio");
  });

  it("describes offsets in human language", () => {
    expect(describeOffsetMinutes(0)).toBe("No horário do ensaio");
    expect(describeOffsetMinutes(30)).toBe("30 minutos antes");
    expect(describeOffsetMinutes(120)).toBe("2 horas antes");
    expect(describeOffsetMinutes(90)).toBe("1h30 antes");
    expect(describeOffsetMinutes(2880)).toBe("2 dias antes");
    expect(
      formatAlertRuleSummary({
        triggerType: "day_of_at_time",
        timeOfDay: "08:00",
        channels: ["in_app", "push"],
      }),
    ).toBe("No dia do ensaio às 08:00 · No app, Notificação push");
  });

  it("formats the song count label", () => {
    expect(rehearsalSongCountLabel(0)).toBe("Sem músicas");
    expect(rehearsalSongCountLabel(1)).toBe("1 música");
    expect(rehearsalSongCountLabel(4)).toBe("4 músicas");
  });
});
