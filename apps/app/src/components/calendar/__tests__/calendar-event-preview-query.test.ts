import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CALENDAR_EVENT_PREVIEW_STALE_TIME,
  getCalendarEventPreviewQueryKey,
  getCalendarPreviewEventId,
} from "../calendar-event-preview-query";
import type { CalendarItem } from "@/lib/calendar";

describe("Calendar event preview React Query helpers & loading.tsx", () => {
  it("gera queryKey estável e extrai eventId apenas de eventos e escalas", () => {
    expect(getCalendarEventPreviewQueryKey("evt-1")).toEqual([
      "calendar",
      "event-preview",
      "evt-1",
    ]);
    expect(CALENDAR_EVENT_PREVIEW_STALE_TIME).toBe(2 * 60 * 1000);

    const eventItem = {
      id: "1",
      type: "event",
      title: "Culto",
      startsAt: "2026-11-29T12:00:00.000Z",
      endsAt: "2026-11-29T14:00:00.000Z",
      allDay: false,
      metadata: { eventId: "evt-1" },
    } as CalendarItem;

    const birthdayItem = {
      id: "2",
      type: "birthday",
      title: "Aniversário",
      startsAt: "2026-11-29T00:00:00.000Z",
      endsAt: "2026-11-29T23:59:59.000Z",
      allDay: true,
    } as CalendarItem;

    expect(getCalendarPreviewEventId(eventItem)).toBe("evt-1");
    expect(getCalendarPreviewEventId(birthdayItem)).toBeNull();
    expect(getCalendarPreviewEventId(null)).toBeNull();
  });

  it("garante que calendar/loading.tsx não usa data-calendar-active nem data-calendar-container", () => {
    const loadingPath = join(
      import.meta.dir,
      "..",
      "..",
      "..",
      "app",
      "(app)",
      "calendar",
      "loading.tsx",
    );
    const source = readFileSync(loadingPath, "utf8");
    expect(source).not.toContain("data-calendar-active");
    expect(source).not.toContain("data-calendar-container");
  });
});
