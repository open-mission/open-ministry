import { describe, expect, it } from "bun:test";
import {
  computeGridHours,
  layoutDayTimedItems,
  type CalendarItem,
} from "@/lib/calendar";

describe("Calendar Time-Grid Event Sizing & Positioning", () => {
  it("calculates correct top and height proportional to start and end times", () => {
    const items: CalendarItem[] = [
      {
        id: "event-1",
        type: "event",
        title: "Culto de Cura e Libertação",
        startsAt: "2026-11-08T18:00:00.000Z",
        endsAt: "2026-11-08T20:00:00.000Z",
        allDay: false,
        color: "primary",
      },
    ];

    // Grid starts at 07:00, 60px per hour
    const positioned = layoutDayTimedItems(items, 7, 60);

    expect(positioned).toHaveLength(1);
    const p = positioned[0];

    // Start is 18:00 (11 hours after 07:00) => top = 11 * 60 = 660px
    // Note: depending on local timezone parsing of ISO, parseISO preserves local hours
    const startHour = new Date("2026-11-08T18:00:00.000Z").getHours();
    const expectedTop = (startHour - 7) * 60;
    expect(p.top).toBe(expectedTop);

    // Duration is 2 hours (120 min) => height = (120/60) * 60 - 2 = 118px
    expect(p.durationMinutes).toBe(120);
    expect(p.height).toBe(118);
    expect(p.leftPercent).toBe(0);
    expect(p.widthPercent).toBe(100);
  });

  it("handles 1.5 hour event with fractional height", () => {
    const items: CalendarItem[] = [
      {
        id: "event-2",
        type: "event",
        title: "Culto Noturno",
        startsAt: "2026-11-08T19:30:00.000Z",
        endsAt: "2026-11-08T21:00:00.000Z",
        allDay: false,
        color: "primary",
      },
    ];

    const positioned = layoutDayTimedItems(items, 7, 60);
    expect(positioned).toHaveLength(1);
    expect(positioned[0].durationMinutes).toBe(90);
    // 1.5h * 60 - 2 = 88px
    expect(positioned[0].height).toBe(88);
  });

  it("splits columns for overlapping events", () => {
    const items: CalendarItem[] = [
      {
        id: "event-a",
        type: "event",
        title: "Culto Geral",
        startsAt: "2026-11-08T18:00:00.000Z",
        endsAt: "2026-11-08T20:00:00.000Z",
        allDay: false,
        color: "primary",
      },
      {
        id: "event-b",
        type: "assignment",
        title: "Reunião de Líderes",
        startsAt: "2026-11-08T19:00:00.000Z",
        endsAt: "2026-11-08T20:30:00.000Z",
        allDay: false,
        color: "emerald",
      },
    ];

    const positioned = layoutDayTimedItems(items, 7, 60);
    expect(positioned).toHaveLength(2);

    // Should be placed in 2 side-by-side columns
    const first = positioned.find((p) => p.item.id === "event-a")!;
    const second = positioned.find((p) => p.item.id === "event-b")!;

    expect(first.widthPercent).toBe(50);
    expect(second.widthPercent).toBe(50);
    expect(first.leftPercent).toBe(0);
    expect(second.leftPercent).toBe(50);
  });

  it("dynamically computes grid hours range based on events", () => {
    const items: CalendarItem[] = [
      {
        id: "event-early",
        type: "event",
        title: "Oração da Madrugada",
        startsAt: "2026-11-08T06:00:00.000Z",
        endsAt: "2026-11-08T07:00:00.000Z",
        allDay: false,
        color: "purple",
      },
      {
        id: "event-night",
        type: "event",
        title: "Vigília",
        startsAt: "2026-11-08T22:00:00.000Z",
        endsAt: "2026-11-08T23:30:00.000Z",
        allDay: false,
        color: "purple",
      },
    ];

    const { minHour, maxHour, hours } = computeGridHours(items, 7, 22);

    // Should expand to include 06:00 and 23/24:00
    const earlyHour = new Date("2026-11-08T06:00:00.000Z").getHours();
    expect(minHour).toBeLessThanOrEqual(earlyHour);
    expect(maxHour).toBeGreaterThanOrEqual(23);
    expect(hours).toContain(earlyHour);
  });
});
