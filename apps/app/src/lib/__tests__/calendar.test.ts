import { describe, expect, it } from "bun:test";
import {
  buildCalendarIcs,
  calendarDateKey,
  calendarTimeLabel,
  calendarTimeParts,
  computeGridHours,
  dedupeCalendarItems,
  getCalendarRange,
  isCalendarItemInRange,
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

function makeItem(overrides: Partial<CalendarItem>): CalendarItem {
  return {
    id: "item-1",
    type: "event",
    title: "Culto",
    startsAt: "2026-11-08T23:00:00.000Z",
    endsAt: "2026-11-09T01:00:00.000Z",
    allDay: false,
    color: "primary",
    ...overrides,
  };
}

describe("Calendar timezone helpers", () => {
  it("resolves the calendar day in the church timezone", () => {
    // 23:00 UTC is still 20:00 on the same day in São Paulo.
    expect(calendarDateKey("2026-11-08T23:00:00.000Z", "America/Sao_Paulo")).toBe(
      "2026-11-08",
    );
    // 01:30 UTC is still the previous day in São Paulo.
    expect(calendarDateKey("2026-03-08T01:30:00.000Z", "America/Sao_Paulo")).toBe(
      "2026-03-07",
    );
    expect(calendarDateKey("2026-03-08T01:30:00.000Z", "UTC")).toBe("2026-03-08");
  });

  it("formats times and time parts in the church timezone", () => {
    expect(
      calendarTimeLabel("2026-11-08T23:00:00.000Z", "America/Sao_Paulo"),
    ).toBe("20:00");
    expect(calendarTimeParts("2026-11-08T23:30:00.000Z", "America/Sao_Paulo")).toEqual(
      { hour: 20, minute: 30, minutes: 1230 },
    );
  });

  it("computes the grid and layout in the church timezone", () => {
    const item = makeItem({});
    const { minHour, maxHour } = computeGridHours(
      [item],
      7,
      22,
      "America/Sao_Paulo",
    );
    expect(minHour).toBe(7);
    expect(maxHour).toBe(22);

    const [positioned] = layoutDayTimedItems(
      [item],
      7,
      60,
      "America/Sao_Paulo",
    );
    expect(positioned.startTimeLabel).toBe("20:00");
    expect(positioned.endTimeLabel).toBe("22:00");
    expect(positioned.top).toBe(13 * 60);
  });
});

describe("Calendar visible range", () => {
  const reference = new Date(2026, 10, 8); // 8 Nov 2026, local midnight

  it("builds a rolling 30-day agenda window including today", () => {
    const range = getCalendarRange("agenda", reference, 0);
    expect(range.startKey).toBe("2026-11-08");
    expect(range.endKey).toBe("2026-12-07");
  });

  it("builds day, month and year ranges", () => {
    const day = getCalendarRange("day", reference, 0);
    expect(day.startKey).toBe("2026-11-08");
    expect(day.endKey).toBe("2026-11-08");

    const month = getCalendarRange("month", reference, 0);
    expect(month.startKey).toBe("2026-11-01");
    expect(month.endKey).toBe("2026-12-05");

    const year = getCalendarRange("year", reference, 0);
    expect(year.startKey).toBe("2026-01-01");
    expect(year.endKey).toBe("2026-12-31");
  });

  it("filters items by the day key in the church timezone", () => {
    const item = makeItem({});
    const day = getCalendarRange("day", reference, 0);
    const nextDay = getCalendarRange("day", new Date(2026, 10, 9), 0);

    expect(isCalendarItemInRange(item, day, "America/Sao_Paulo")).toBe(true);
    expect(isCalendarItemInRange(item, nextDay, "America/Sao_Paulo")).toBe(
      false,
    );
  });
});

describe("Calendar item deduplication", () => {
  it("replaces a generic event with the member's assignment", () => {
    const event = makeItem({ id: "event-1", metadata: { eventId: "e1" } });
    const assignment = makeItem({
      id: "assignment-1",
      type: "assignment",
      metadata: { eventId: "e1" },
    });
    const otherEvent = makeItem({ id: "event-2", metadata: { eventId: "e2" } });

    const result = dedupeCalendarItems([event, assignment, otherEvent]);
    expect(result.map((item) => item.id)).toEqual([
      "assignment-1",
      "event-2",
    ]);
  });
});

describe("Calendar ICS export", () => {
  it("exports timed and all-day items with escaped text", () => {
    const ics = buildCalendarIcs(
      [
        makeItem({ title: "Culto, domingo", location: "Templo; central" }),
        makeItem({
          id: "birthday-1",
          type: "birthday",
          title: "Aniversário: Ana",
          startsAt: "2026-11-08T12:00:00.000Z",
          endsAt: "2026-11-08T23:59:59.000Z",
          allDay: true,
        }),
      ],
      { timeZone: "America/Sao_Paulo", calendarName: "Agenda, teste" },
    );

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("X-WR-CALNAME:Agenda\\, teste");
    expect(ics).toContain("SUMMARY:Culto\\, domingo");
    expect(ics).toContain("LOCATION:Templo\\; central");
    expect(ics).toContain("DTSTART:20261108T230000Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261108");
    expect(ics).toContain("DTEND;VALUE=DATE:20261109");
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
  });

  it("folds long lines to 75 characters", () => {
    const ics = buildCalendarIcs([
      makeItem({ title: "A".repeat(200) }),
    ]);
    const lines = ics.split("\r\n");
    expect(lines.every((line) => line.length <= 75)).toBe(true);
  });
});
