import { addDays, addMonths } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import type { RecurrenceOption } from "@/lib/event-options";

export const EVENT_TIME_ZONE = "America/Sao_Paulo";
export const MAX_RECURRENCE_INSTANCES = 104;

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
  const occurrences = [startsAt];

  if (recurrence === "none" || !recurrenceEndsAt) {
    return [{ startsAt, endsAt }];
  }

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

export async function listEvents(organizationId: string) {
  return db.query.event.findMany({
    where: eq(schema.event.organizationId, organizationId),
    with: {
      departments: {
        with: {
          department: {
            with: { functions: true },
          },
        },
      },
      schedule: {
        with: {
          assignments: {
            with: {
              person: { with: { user: true } },
              function: true,
            },
          },
        },
      },
    },
    orderBy: (events, { asc }) => [asc(events.startsAt)],
    limit: 500,
  });
}

export async function getEvent(
  organizationId: string,
  eventId: string,
) {
  const row = await db.query.event.findFirst({
    where: (event, { and, eq }) =>
      and(
        eq(event.id, eventId),
        eq(event.organizationId, organizationId),
      ),
    with: {
      departments: {
        with: {
          department: {
            with: { functions: true },
          },
        },
      },
      schedule: {
        with: {
          assignments: {
            with: {
              person: { with: { user: true } },
              function: true,
            },
          },
        },
      },
      planItems: {
        with: {
          person: { with: { user: true } },
        },
        orderBy: (items, { asc }) => [asc(items.order), asc(items.createdAt)],
      },
    },
  });

  return row ?? null;
}

export type EventRecord = NonNullable<Awaited<ReturnType<typeof getEvent>>>;
export type EventListItem = Awaited<ReturnType<typeof listEvents>>[number];

export function scheduleProgress(event: {
  departments: { department: { functions: { id: string }[] } }[];
  schedule?: {
    assignments: { functionId: string }[];
  } | null;
}) {
  const totalFunctions = event.departments.reduce(
    (total, item) => total + item.department.functions.length,
    0,
  );
  const assignments = event.schedule?.assignments ?? [];
  const filledFunctions = new Set(
    assignments.map((assignment) => assignment.functionId),
  ).size;

  return {
    totalFunctions,
    filledFunctions,
    assignmentsCount: assignments.length,
    status:
      assignments.length === 0
        ? ("empty" as const)
        : filledFunctions >= totalFunctions
          ? ("complete" as const)
          : ("partial" as const),
  };
}

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  timeZone: EVENT_TIME_ZONE,
});

const monthLongFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: EVENT_TIME_ZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: EVENT_TIME_ZONE,
});

const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: EVENT_TIME_ZONE,
});

const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: EVENT_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: EVENT_TIME_ZONE,
});

const inputDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: EVENT_TIME_ZONE,
});

const inputTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: EVENT_TIME_ZONE,
});

export function eventDateParts(date: Date) {
  return {
    day: dayFormatter.format(date),
    month: monthLongFormatter.format(date),
    monthShort: monthLongFormatter
      .format(date)
      .slice(0, 3)
      .toUpperCase(),
    weekday: weekdayFormatter.format(date).replace(".", ""),
  };
}

export function formatEventFullDate(date: Date) {
  return fullDateFormatter.format(date);
}

export function formatEventMonthYear(date: Date) {
  const value = monthYearFormatter.format(date);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatEventTime(date: Date) {
  const [hour, minute] = timeFormatter.format(date).split(":");

  return minute === "00" ? `${hour}h` : `${hour}h${minute}`;
}

export function formatEventTimeRange(startsAt: Date, endsAt: Date) {
  return `${formatEventTime(startsAt)} – ${formatEventTime(endsAt)}`;
}

export function toInputDate(date: Date) {
  return inputDateFormatter.format(date);
}

export function toInputTime(date: Date) {
  return inputTimeFormatter.format(date);
}

export function isPastEvent(endsAt: Date, now: Date = new Date()) {
  return endsAt.getTime() < now.getTime();
}

export function splitEvents<T extends { startsAt: Date; endsAt: Date }>(
  events: T[],
  now: Date = new Date(),
) {
  const upcoming = events
    .filter((event) => !isPastEvent(event.endsAt, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = events
    .filter((event) => isPastEvent(event.endsAt, now))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  return { upcoming, past };
}

export function recurrenceLabel(
  recurrence: string | null,
  interval: number | null,
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

  const weeks = interval ?? 1;
  return weeks === 1
    ? "Toda semana"
    : `A cada ${weeks} semanas`;
}

export * from "./plan-utils";
