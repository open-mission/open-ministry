import { addDays, addMonths } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import type { RecurrenceOption } from "@/lib/event-options";
import { EVENT_TIME_ZONE } from "@/lib/plan-utils";

export const MAX_RECURRENCE_INSTANCES = 104;

export const WEEKDAY_INFO = [
  { index: 0, name: "Domingo", shortName: "domingo", gender: "m" },
  { index: 1, name: "Segunda-feira", shortName: "segunda-feira", gender: "f" },
  { index: 2, name: "Terça-feira", shortName: "terça-feira", gender: "f" },
  { index: 3, name: "Quarta-feira", shortName: "quarta-feira", gender: "f" },
  { index: 4, name: "Quinta-feira", shortName: "quinta-feira", gender: "f" },
  { index: 5, name: "Sexta-feira", shortName: "sexta-feira", gender: "f" },
  { index: 6, name: "Sábado", shortName: "sábado", gender: "m" },
] as const;

export function formatNthWeekdayLabel(nth: number, weekday: number): string {
  const info = WEEKDAY_INFO[weekday] ?? WEEKDAY_INFO[0];
  const isFem = info.gender === "f";

  if (nth === -1) {
    return isFem
      ? `Toda última ${info.shortName} do mês`
      : `Todo último ${info.shortName} do mês`;
  }

  const ordinal = isFem ? `${nth}ª` : `${nth}º`;
  const prefix = isFem ? `Toda ${ordinal}` : `Todo ${ordinal}`;

  return `${prefix} ${info.shortName} do mês`;
}

export function getNthWeekdayInfo(date: Date | string) {
  let zoned: Date;
  if (typeof date === "string") {
    const [y, m, d] = date.split("-").map(Number);
    zoned = new Date(y, (m || 1) - 1, d || 1);
  } else {
    zoned = toZonedTime(date, EVENT_TIME_ZONE);
  }

  const day = zoned.getDate();
  const weekday = zoned.getDay();
  const weekdayObj = WEEKDAY_INFO[weekday] ?? WEEKDAY_INFO[0];
  const nth = Math.ceil(day / 7);

  const totalDays = new Date(
    zoned.getFullYear(),
    zoned.getMonth() + 1,
    0,
  ).getDate();
  const isLast = day + 7 > totalDays;

  return {
    day,
    weekday,
    weekdayName: weekdayObj.name,
    shortName: weekdayObj.shortName,
    gender: weekdayObj.gender,
    nth,
    isLast,
    label: formatNthWeekdayLabel(nth, weekday),
    lastLabel: formatNthWeekdayLabel(-1, weekday),
  };
}

export function findNthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  targetWeekday: number,
  nth: number,
): number | null {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  if (nth === -1) {
    const lastDayOfWeek = new Date(year, monthIndex, daysInMonth).getDay();
    const backOffset = (lastDayOfWeek - targetWeekday + 7) % 7;
    return daysInMonth - backOffset;
  }

  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const dayOffset = (targetWeekday - firstDayOfWeek + 7) % 7;
  const firstOccurrenceDay = 1 + dayOffset;
  const targetDay = firstOccurrenceDay + (nth - 1) * 7;

  if (targetDay > daysInMonth) {
    return null;
  }

  return targetDay;
}

export function zonedDateTimeToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date} ${time}:00`, EVENT_TIME_ZONE);
}

export function endOfDayInZone(date: string): Date {
  return fromZonedTime(`${date} 23:59:59`, EVENT_TIME_ZONE);
}

export function applyTimeOfDay(
  date: Date,
  time: string,
  durationMs: number,
): { startsAt: Date; endsAt: Date } {
  const zoned = toZonedTime(date, EVENT_TIME_ZONE);
  const [hour, minute] = time.split(":").map(Number);
  zoned.setHours(hour, minute, 0, 0);

  const startsAt = fromZonedTime(zoned, EVENT_TIME_ZONE);

  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + durationMs),
  };
}

function addInZone(date: Date, amount: number, unit: "days" | "months") {
  const zoned = toZonedTime(date, EVENT_TIME_ZONE);
  const next =
    unit === "months" ? addMonths(zoned, amount) : addDays(zoned, amount);

  return fromZonedTime(next, EVENT_TIME_ZONE);
}

export function generateOccurrences({
  startsAt,
  endsAt,
  recurrence,
  recurrenceInterval,
  recurrenceEndsAt,
}: {
  startsAt: Date;
  endsAt: Date;
  recurrence: RecurrenceOption;
  recurrenceInterval: number | null;
  recurrenceEndsAt: Date | null;
}): { startsAt: Date; endsAt: Date }[] {
  const duration = endsAt.getTime() - startsAt.getTime();

  if (recurrence === "none" || !recurrenceEndsAt) {
    return [{ startsAt, endsAt }];
  }

  if (recurrence === "monthly_nth_weekday") {
    const startZoned = toZonedTime(startsAt, EVENT_TIME_ZONE);
    const startYear = startZoned.getFullYear();
    const startMonth = startZoned.getMonth();
    const targetWeekday = startZoned.getDay();
    const nth = recurrenceInterval ?? Math.ceil(startZoned.getDate() / 7);

    const occurrencesList: Date[] = [];
    let monthOffset = 0;

    while (
      occurrencesList.length < MAX_RECURRENCE_INSTANCES &&
      monthOffset < 120
    ) {
      const currentMonthDate = new Date(startYear, startMonth + monthOffset, 1);
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth();
      monthOffset += 1;

      const day = findNthWeekdayOfMonth(year, month, targetWeekday, nth);
      if (!day) continue;

      const yearStr = String(year).padStart(4, "0");
      const monthStr = String(month + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const hourStr = String(startZoned.getHours()).padStart(2, "0");
      const minuteStr = String(startZoned.getMinutes()).padStart(2, "0");
      const occurrence = zonedDateTimeToUtc(
        `${yearStr}-${monthStr}-${dayStr}`,
        `${hourStr}:${minuteStr}`,
      );

      if (occurrence.getTime() < startsAt.getTime()) {
        continue;
      }

      if (occurrence.getTime() > recurrenceEndsAt.getTime()) {
        break;
      }

      occurrencesList.push(occurrence);
    }

    if (occurrencesList.length === 0) {
      occurrencesList.push(startsAt);
    }

    return occurrencesList.map((occurrence) => ({
      startsAt: occurrence,
      endsAt: new Date(occurrence.getTime() + duration),
    }));
  }

  const occurrences = [startsAt];
  const stepDays =
    recurrence === "weekly"
      ? 7
      : recurrence === "biweekly"
        ? 14
        : (recurrenceInterval ?? 1) * 7;

  let index = 1;

  while (occurrences.length < MAX_RECURRENCE_INSTANCES) {
    const current =
      recurrence === "monthly"
        ? addInZone(startsAt, index, "months")
        : addInZone(startsAt, stepDays * index, "days");

    if (current.getTime() > recurrenceEndsAt.getTime()) {
      break;
    }

    occurrences.push(current);
    index += 1;
  }

  return occurrences.map((occurrence) => ({
    startsAt: occurrence,
    endsAt: new Date(occurrence.getTime() + duration),
  }));
}

export function recurrenceLabel(
  recurrence: string | null,
  interval: number | null,
  startsAt?: Date | null,
) {
  if (!recurrence) {
    return null;
  }

  if (recurrence === "weekly") {
    return "Toda semana";
  }

  if (recurrence === "biweekly") {
    return "A cada duas semanas";
  }

  if (recurrence === "monthly") {
    return "Todo mês";
  }

  if (recurrence === "monthly_nth_weekday") {
    if (startsAt) {
      const zoned = toZonedTime(startsAt, EVENT_TIME_ZONE);
      const weekday = zoned.getDay();
      const nth = interval ?? Math.ceil(zoned.getDate() / 7);
      return formatNthWeekdayLabel(nth, weekday);
    }
    const nthLabel =
      interval === -1
        ? "último(a)"
        : interval
          ? `${interval}º`
          : "";
    return nthLabel
      ? `Todo ${nthLabel} dia da semana do mês`
      : "Todo mês no mesmo dia da semana";
  }

  const weeks = interval ?? 1;
  return weeks === 1 ? "Toda semana" : `A cada ${weeks} semanas`;
}
