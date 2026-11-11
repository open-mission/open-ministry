import { and, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import { EVENT_TIME_ZONE } from "./plan-utils";

export * from "./recurrence-utils";

export async function listUpcomingEvents(organizationId: string, limit = 12) {
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);

  return remember(
    `org:${organizationId}:events:upcoming:${limit}`,
    60,
    async () => {
      return db.query.event.findMany({
        where: and(
          eq(schema.event.organizationId, organizationId),
          gte(schema.event.endsAt, cutoff),
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
        },
        orderBy: (events, { asc }) => [asc(events.startsAt)],
        limit,
      });
    },
    [`events:${organizationId}`],
  );
}

export async function listEvents(organizationId: string) {
  return remember(
    `org:${organizationId}:events:all`,
    60,
    async () => {
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
    },
    [`events:${organizationId}`],
  );
}

/**
 * Lean event projection for the calendar: only the fields rendered in the
 * month/week views plus the acting departments and the assignments needed to
 * highlight the current person's shifts. Avoids loading full people/users and
 * department functions for up to 500 events.
 */
export async function listCalendarEvents(organizationId: string) {
  return remember(
    `org:${organizationId}:events:calendar`,
    60,
    async () => {
      return db.query.event.findMany({
        where: eq(schema.event.organizationId, organizationId),
        columns: {
          id: true,
          title: true,
          description: true,
          kind: true,
          location: true,
          startsAt: true,
          endsAt: true,
        },
        with: {
          departments: {
            columns: { departmentId: true },
            with: {
              department: {
                columns: { name: true },
              },
            },
          },
          schedule: {
            columns: { id: true },
            with: {
              assignments: {
                columns: {
                  personId: true,
                  departmentId: true,
                  functionId: true,
                },
                with: {
                  function: {
                    columns: { name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: (events, { asc }) => [asc(events.startsAt)],
        limit: 500,
      });
    },
    [`events:${organizationId}`, `departments:${organizationId}`],
  );
}

export async function getSeriesOccurrenceCount(
  organizationId: string,
  seriesId: string,
) {
  const rows = await db
    .select({ id: schema.event.id })
    .from(schema.event)
    .where(
      and(
        eq(schema.event.organizationId, organizationId),
        eq(schema.event.seriesId, seriesId),
      ),
    );

  return rows.length;
}

export async function getEvent(
  organizationId: string,
  eventId: string,
) {
  return remember(
    `org:${organizationId}:event:${eventId}`,
    120,
    async () => {
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
              song: true,
            },
            orderBy: (items, { asc }) => [asc(items.order), asc(items.createdAt)],
          },
        },
      });

      return row ?? null;
    },
    [`events:${organizationId}`, `event:${eventId}`],
  );
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

export type CoverageFilter = "attention" | "complete" | "all";

export function parseCoverageFilter(
  value?: string | string[],
): CoverageFilter | null {
  const candidate = Array.isArray(value) ? value[0] : value;

  return candidate === "attention" ||
    candidate === "complete" ||
    candidate === "all"
    ? candidate
    : null;
}

type CoverageEvent = {
  id: string;
  title: string;
  location: string | null;
  startsAt: Date;
  departments: {
    departmentId: string;
    department: { functions: { id: string; name: string }[] };
  }[];
  schedule?: {
    assignments: { functionId: string; departmentId: string }[];
  } | null;
};

/**
 * A function counts as covered when at least one person is assigned to it.
 * Events with no functions are treated as setup work, not as complete.
 */
export function coverageStatus(event: CoverageEvent) {
  const progress = scheduleProgress(event);

  if (progress.totalFunctions === 0) {
    return "setup" as const;
  }

  if (progress.filledFunctions >= progress.totalFunctions) {
    return "complete" as const;
  }

  return progress.assignmentsCount === 0 ? ("empty" as const) : ("partial" as const);
}

export function needsAttention(event: CoverageEvent) {
  return coverageStatus(event) !== "complete";
}

export function isScaleComplete(event: CoverageEvent) {
  return coverageStatus(event) === "complete";
}

export function eventMatchesQuery(event: CoverageEvent, query: string) {
  const term = query.trim().toLocaleLowerCase("pt-BR");

  if (!term) {
    return true;
  }

  const haystack = [event.title, event.location ?? ""]
    .join(" ")
    .toLocaleLowerCase("pt-BR");

  return haystack.includes(term);
}

export function eventActsInDepartment(
  event: CoverageEvent,
  departmentId?: string,
) {
  if (!departmentId) {
    return true;
  }

  return event.departments.some((item) => item.departmentId === departmentId);
}

export function filterEvents<T extends CoverageEvent>(
  events: T[],
  filters: { coverage?: CoverageFilter; departmentId?: string; query?: string },
) {
  const coverage = filters.coverage ?? "all";

  return events.filter((event) => {
    if (coverage === "attention" && !needsAttention(event)) {
      return false;
    }

    if (coverage === "complete" && !isScaleComplete(event)) {
      return false;
    }

    if (!eventActsInDepartment(event, filters.departmentId)) {
      return false;
    }

    if (filters.query && !eventMatchesQuery(event, filters.query)) {
      return false;
    }

    return true;
  });
}

export function coverageCounts(events: CoverageEvent[]) {
  return events.reduce(
    (counts, event) => {
      if (isScaleComplete(event)) {
        counts.complete += 1;
      } else {
        counts.attention += 1;
      }

      counts.all += 1;
      return counts;
    },
    { attention: 0, complete: 0, all: 0 },
  );
}

export type DepartmentCoverage = {
  departmentId: string;
  departmentName: string;
  eventsCount: number;
  totalSlots: number;
  coveredSlots: number;
  eventsWithGaps: number;
  nextGap: {
    eventId: string;
    eventTitle: string;
    startsAt: Date;
    missingFunctions: string[];
  } | null;
};

/**
 * Summarises, per department, how many function slots in upcoming events have
 * at least one person. This powers the coverage board on the Escalas page.
 */
export function buildDepartmentCoverage(
  events: CoverageEvent[],
  departments: { id: string; name: string }[],
): DepartmentCoverage[] {
  return departments
    .map((department) => {
      const actingEvents = events
        .filter((event) =>
          event.departments.some(
            (item) => item.departmentId === department.id,
          ),
        )
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

      let totalSlots = 0;
      let coveredSlots = 0;
      let eventsWithGaps = 0;
      let nextGap: DepartmentCoverage["nextGap"] = null;

      for (const event of actingEvents) {
        const departmentFunctions =
          event.departments.find(
            (item) => item.departmentId === department.id,
          )?.department.functions ?? [];
        const assignedFunctionIds = new Set(
          (event.schedule?.assignments ?? [])
            .filter((assignment) => assignment.departmentId === department.id)
            .map((assignment) => assignment.functionId),
        );
        const missingFunctions = departmentFunctions.filter(
          (departmentFunction) =>
            !assignedFunctionIds.has(departmentFunction.id),
        );

        totalSlots += departmentFunctions.length;
        coveredSlots += departmentFunctions.length - missingFunctions.length;

        if (missingFunctions.length > 0) {
          eventsWithGaps += 1;

          if (!nextGap) {
            nextGap = {
              eventId: event.id,
              eventTitle: event.title,
              startsAt: event.startsAt,
              missingFunctions: missingFunctions.map(
                (departmentFunction) => departmentFunction.name,
              ),
            };
          }
        }
      }

      return {
        departmentId: department.id,
        departmentName: department.name,
        eventsCount: actingEvents.length,
        totalSlots,
        coveredSlots,
        eventsWithGaps,
        nextGap,
      };
    })
    .filter((department) => department.eventsCount > 0);
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

/**
 * Human-friendly day label for the next few days. Returns null for dates
 * outside the yesterday/today/tomorrow window so callers can fall back to the
 * formatted weekday.
 */
export function relativeDayLabel(date: Date, now: Date = new Date()) {
  const target = toInputDate(date);
  const today = toInputDate(now);
  const difference = Math.round(
    (Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );

  if (difference === 0) {
    return "Hoje";
  }

  if (difference === 1) {
    return "Amanhã";
  }

  if (difference === -1) {
    return "Ontem";
  }

  return null;
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

export * from "./plan-utils";
