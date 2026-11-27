import { and, eq, gte, ne } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import { clampPageLimit, paginationCacheSuffix } from "@/lib/pagination";

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
          functions: true,
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

export async function listEvents(organizationId: string, requestedLimit = 500) {
  const limit = clampPageLimit(requestedLimit, 500, 500);
  return remember(
    `org:${organizationId}:events:all${paginationCacheSuffix(limit, 0, 500)}`,
    60,
    async () => {
      return db.query.event.findMany({
        // Ensaios têm fluxo próprio (aba do departamento) e não entram na
        // agenda de cultos nem na cobertura de escalas.
        where: and(
          eq(schema.event.organizationId, organizationId),
          ne(schema.event.kind, "rehearsal"),
        ),
        with: {
          departments: {
            with: {
              department: {
                with: { functions: true },
              },
            },
          },
          functions: true,
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

/**
 * Lean event projection for the calendar: only the fields rendered in the
 * month/week views plus the acting departments, configured function IDs and
 * assignments needed to summarize schedule coverage. Avoids loading full
 * people/users for up to 500 events.
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
                with: {
                  functions: {
                    columns: { id: true },
                  },
                },
              },
            },
          },
          functions: {
            columns: {
              departmentId: true,
              functionId: true,
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
          functions: true,
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

export * from "./events-pure";
export * from "./plan-utils";
