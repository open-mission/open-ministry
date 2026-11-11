import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  type Locale,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type { AvailabilityPeriod } from "@/db/schema/people";

export type CalendarItemType = "event" | "assignment" | "unavailability" | "birthday";

export type CalendarItem = {
  id: string;
  type: CalendarItemType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  allDay: boolean;
  color: "primary" | "emerald" | "amber" | "purple" | "blue" | "rose";
  location?: string | null;
  href?: string | null;
  metadata?: {
    eventId?: string;
    departmentId?: string;
    departmentIds?: string[];
    departmentName?: string;
    departmentNames?: string[];
    functionName?: string;
    eventKind?: string;
    reason?: string | null;
    periods?: AvailabilityPeriod[];
    isMyAssignment?: boolean;
    isMine?: boolean;
    personId?: string;
    personName?: string;
  };
};

export type CalendarViewMode = "month" | "week" | "day" | "year" | "agenda";

export type CalendarFilterType =
  | "all"
  | "events"
  | "assignments"
  | "unavailabilities"
  | "birthdays";

export type CalendarPreferences = {
  weekStartsOn: 0 | 1; // 0 = Domingo, 1 = Segunda-feira
  timezone: string;
};

export const COMMON_TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Horário de Brasília (São Paulo, Rio, DF) - UTC-3" },
  { value: "America/Manaus", label: "Horário da Amazônia (Manaus) - UTC-4" },
  { value: "America/Cuiaba", label: "Cuiabá / Campo Grande - UTC-4" },
  { value: "America/Belem", label: "Belém / Macapá - UTC-3" },
  { value: "America/Fortaleza", label: "Fortaleza / Salvador / Nordeste - UTC-3" },
  { value: "America/Porto_Velho", label: "Porto Velho - UTC-4" },
  { value: "America/Boa_Vista", label: "Boa Vista - UTC-4" },
  { value: "America/Rio_Branco", label: "Rio Branco / Acre - UTC-5" },
  { value: "America/Noronha", label: "Fernando de Noronha - UTC-2" },
  { value: "Europe/Lisbon", label: "Lisboa / Portugal - WET/WEST" },
  { value: "America/New_York", label: "Nova York / Flórida (Eastern Time) - UTC-5" },
];

export type PositionedCalendarItem = {
  item: CalendarItem;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
  startTimeLabel: string;
  endTimeLabel: string;
  durationMinutes: number;
};

export const AGENDA_WINDOW_DAYS = 30;

export type CalendarRange = {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
};

/**
 * The range each view actually renders. Counts, "today" behaviour and empty
 * states all read from this, so the header never promises something the grid
 * does not show.
 */
export function getCalendarRange(
  viewMode: CalendarViewMode,
  currentDate: Date,
  weekStartsOn: 0 | 1,
): CalendarRange {
  let start: Date;
  let end: Date;

  switch (viewMode) {
    case "month":
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn });
      break;
    case "week":
      start = startOfWeek(currentDate, { weekStartsOn });
      end = endOfWeek(currentDate, { weekStartsOn });
      break;
    case "day":
      start = startOfDay(currentDate);
      end = startOfDay(currentDate);
      break;
    case "year":
      start = startOfYear(currentDate);
      end = endOfYear(currentDate);
      break;
    case "agenda":
      start = startOfDay(currentDate);
      end = addDays(start, AGENDA_WINDOW_DAYS - 1);
      break;
  }

  return {
    start,
    end,
    startKey: format(start, "yyyy-MM-dd"),
    endKey: format(end, "yyyy-MM-dd"),
  };
}

/** Calendar day key (YYYY-MM-DD) in the church timezone. */
export function calendarDateKey(
  value: Date | string,
  timeZone?: string | null,
): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!timeZone) return format(date, "yyyy-MM-dd");
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function formatCalendarDate(
  value: Date | string,
  pattern: string,
  options?: { timeZone?: string | null; locale?: Locale },
): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  if (options?.timeZone) {
    return formatInTimeZone(date, options.timeZone, pattern, {
      locale: options.locale,
    });
  }
  return format(date, pattern, { locale: options?.locale });
}

export function calendarTimeLabel(
  value: Date | string,
  timeZone?: string | null,
): string {
  return formatCalendarDate(value, "HH:mm", { timeZone });
}

export function calendarTimeParts(
  value: Date | string,
  timeZone?: string | null,
): { hour: number; minute: number; minutes: number } {
  const [hour, minute] = calendarTimeLabel(value, timeZone)
    .split(":")
    .map(Number);
  return { hour, minute, minutes: hour * 60 + minute };
}

export function isCalendarItemInRange(
  item: CalendarItem,
  range: CalendarRange,
  timeZone?: string | null,
): boolean {
  const key = calendarDateKey(item.startsAt, timeZone);
  return key >= range.startKey && key <= range.endKey;
}

/**
 * When the user is assigned to an event, the assignment card replaces the
 * generic event card so the same appointment is not rendered twice.
 */
export function dedupeCalendarItems(items: CalendarItem[]): CalendarItem[] {
  const assignmentEventIds = new Set(
    items
      .filter((item) => item.type === "assignment" && item.metadata?.eventId)
      .map((item) => item.metadata!.eventId!),
  );

  return items.filter((item) => {
    if (item.type === "event" && item.metadata?.eventId) {
      return !assignmentEventIds.has(item.metadata.eventId);
    }
    return true;
  });
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string): string {
  if (line.length <= 74) return line;
  const chunks: string[] = [];
  for (let index = 0; index < line.length; index += 74) {
    chunks.push(`${index === 0 ? "" : " "}${line.slice(index, index + 74)}`);
  }
  return chunks.join("\r\n");
}

function icsUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsDateStamp(value: string): string {
  return value.replace(/-/g, "");
}

/** Minimal, dependency-free ICS export for the visible agenda. */
export function buildCalendarIcs(
  items: CalendarItem[],
  options?: { timeZone?: string | null; calendarName?: string },
): string {
  const timeZone = options?.timeZone ?? "America/Sao_Paulo";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenMinistry//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(options?.calendarName ?? "Agenda")}`,
    `X-WR-TIMEZONE:${timeZone}`,
  ];

  for (const item of items) {
    const start = parseISO(item.startsAt);
    const end = parseISO(item.endsAt);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${item.id}@openministry`);
    lines.push(`DTSTAMP:${icsUtcStamp(new Date())}`);

    if (item.allDay) {
      const startKey = calendarDateKey(item.startsAt, timeZone);
      lines.push(`DTSTART;VALUE=DATE:${icsDateStamp(startKey)}`);
      lines.push(
        `DTEND;VALUE=DATE:${icsDateStamp(
          format(addDays(parseISO(startKey), 1), "yyyy-MM-dd"),
        )}`,
      );
    } else {
      lines.push(`DTSTART:${icsUtcStamp(start)}`);
      lines.push(`DTEND:${icsUtcStamp(end)}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(item.title)}`);
    if (item.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(item.description)}`);
    }
    if (item.location) {
      lines.push(`LOCATION:${escapeIcsText(item.location)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n");
}

export function computeGridHours(
  items: CalendarItem[],
  defaultStart = 7,
  defaultEnd = 23,
  timeZone?: string | null,
): { minHour: number; maxHour: number; hours: number[] } {
  let minHour = defaultStart;
  let maxHour = defaultEnd;

  for (const item of items) {
    if (item.allDay) continue;
    try {
      const start = calendarTimeParts(item.startsAt, timeZone);
      const end = calendarTimeParts(item.endsAt, timeZone);
      const startHour = start.hour;
      const endHour = end.minute > 0 ? end.hour + 1 : end.hour;

      if (startHour < minHour) minHour = Math.max(0, startHour);
      if (endHour > maxHour) maxHour = Math.min(24, endHour);
    } catch {
      // Ignore invalid date
    }
  }

  const hours: number[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    hours.push(h);
  }

  return { minHour, maxHour, hours };
}

export function layoutDayTimedItems(
  items: CalendarItem[],
  minHour: number,
  hourHeight: number,
  timeZone?: string | null,
): PositionedCalendarItem[] {
  if (items.length === 0) return [];

  const rawList = items
    .filter((item) => !item.allDay)
    .map((item) => {
      const startParts = calendarTimeParts(item.startsAt, timeZone);
      const endParts = calendarTimeParts(item.endsAt, timeZone);

      const startMinutes = startParts.minutes;
      let endMinutes = endParts.minutes;

      // Fallback if endsAt <= startsAt
      if (endMinutes <= startMinutes) {
        endMinutes = startMinutes + 60;
      }

      const gridStartMinutes = minHour * 60;
      const topMinutes = Math.max(0, startMinutes - gridStartMinutes);
      const durationMinutes = Math.max(30, endMinutes - startMinutes);

      const top = (topMinutes / 60) * hourHeight;
      const height = Math.max(28, (durationMinutes / 60) * hourHeight - 2);

      const startTimeLabel = calendarTimeLabel(item.startsAt, timeZone);
      const endTimeLabel = calendarTimeLabel(item.endsAt, timeZone);

      return {
        item,
        startMinutes,
        endMinutes,
        top,
        height,
        startTimeLabel,
        endTimeLabel,
        durationMinutes,
      };
    })
    .sort(
      (a, b) =>
        a.startMinutes - b.startMinutes ||
        b.durationMinutes - a.durationMinutes,
    );

  // Group into overlapping clusters
  const clusters: (typeof rawList)[] = [];
  let currentCluster: typeof rawList = [];
  let clusterEnd = -1;

  for (const ev of rawList) {
    if (currentCluster.length === 0) {
      currentCluster.push(ev);
      clusterEnd = ev.endMinutes;
    } else if (ev.startMinutes < clusterEnd) {
      currentCluster.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [ev];
      clusterEnd = ev.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns within each cluster
  const result: PositionedCalendarItem[] = [];

  for (const cluster of clusters) {
    const columns: (typeof rawList)[] = [];

    for (const ev of cluster) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const lastInCol = columns[c][columns[c].length - 1];
        if (lastInCol.endMinutes <= ev.startMinutes) {
          columns[c].push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([ev]);
      }
    }

    const numCols = columns.length;
    for (let c = 0; c < numCols; c++) {
      for (const ev of columns[c]) {
        result.push({
          item: ev.item,
          top: ev.top,
          height: ev.height,
          leftPercent: (c / numCols) * 100,
          widthPercent: 100 / numCols,
          startTimeLabel: ev.startTimeLabel,
          endTimeLabel: ev.endTimeLabel,
          durationMinutes: ev.durationMinutes,
        });
      }
    }
  }

  return result;
}
