import { format, parseISO } from "date-fns";
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

export function computeGridHours(
  items: CalendarItem[],
  defaultStart = 7,
  defaultEnd = 23,
): { minHour: number; maxHour: number; hours: number[] } {
  let minHour = defaultStart;
  let maxHour = defaultEnd;

  for (const item of items) {
    if (item.allDay) continue;
    try {
      const start = parseISO(item.startsAt);
      const end = parseISO(item.endsAt);
      const startHour = start.getHours();
      const endHour =
        end.getMinutes() > 0 ? end.getHours() + 1 : end.getHours();

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
): PositionedCalendarItem[] {
  if (items.length === 0) return [];

  const rawList = items
    .filter((item) => !item.allDay)
    .map((item) => {
      const start = parseISO(item.startsAt);
      const end = parseISO(item.endsAt);

      const startMinutes = start.getHours() * 60 + start.getMinutes();
      let endMinutes = end.getHours() * 60 + end.getMinutes();

      // Fallback if endsAt <= startsAt
      if (endMinutes <= startMinutes) {
        endMinutes = startMinutes + 60;
      }

      const gridStartMinutes = minHour * 60;
      const topMinutes = Math.max(0, startMinutes - gridStartMinutes);
      const durationMinutes = Math.max(30, endMinutes - startMinutes);

      const top = (topMinutes / 60) * hourHeight;
      const height = Math.max(28, (durationMinutes / 60) * hourHeight - 2);

      const startTimeLabel = format(start, "HH:mm");
      const endTimeLabel = format(end, "HH:mm");

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
