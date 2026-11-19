import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { buildCalendarIcs } from "@/lib/calendar";
import { EVENT_TIME_ZONE } from "@/lib/plan-utils";

import { buildCalendarFeedUrls, resolveAppBaseUrl } from "../lib/feed-url";
import { generateFeedToken, hashFeedToken, isPlausibleFeedToken } from "../lib/feed-token";
import {
  buildFeedCalendarName,
  buildPersonalFeedItems,
  type FeedEventRow,
} from "../lib/personal-feed";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Eventos já encerrados há mais tempo que isso não entram no feed. */
export const FEED_PAST_DAYS = 30;
/** Horizonte do feed: o bastante para planejamento sem inflar o arquivo. */
export const FEED_FUTURE_DAYS = 365;
/** Teto duro para um arquivo ICS continuar leve em qualquer cliente. */
export const FEED_MAX_EVENTS = 1500;

export type CalendarFeedSettingsInput = {
  label?: string | null;
  includeServices: boolean;
  includeRehearsals: boolean;
  includeDepartmentEvents: boolean;
  includeAssignments: boolean;
};

export type LoadedPersonalFeed = {
  feedId: string;
  organizationId: string;
  personId: string;
  ics: string;
  fileName: string;
};

const feedColumns = {
  id: schema.calendarFeed.id,
  organizationId: schema.calendarFeed.organizationId,
  personId: schema.calendarFeed.personId,
  includeServices: schema.calendarFeed.includeServices,
  includeRehearsals: schema.calendarFeed.includeRehearsals,
  includeDepartmentEvents: schema.calendarFeed.includeDepartmentEvents,
  includeAssignments: schema.calendarFeed.includeAssignments,
  lastUsedAt: schema.calendarFeed.lastUsedAt,
};

type PersonalFeedConfig = {
  id: string;
  organizationId: string;
  personId: string;
  includeServices: boolean;
  includeRehearsals: boolean;
  includeDepartmentEvents: boolean;
  includeAssignments: boolean;
  lastUsedAt: Date | null;
};

async function findActiveFeedByTokenHash(
  tokenHash: string,
): Promise<PersonalFeedConfig | null> {
  const [row] = await db
    .select(feedColumns)
    .from(schema.calendarFeed)
    .where(
      and(
        eq(schema.calendarFeed.tokenHash, tokenHash),
        isNull(schema.calendarFeed.revokedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Registrar o último acesso evita escrita a cada poll do calendário: no máximo
 * uma atualização por hora por feed.
 */
async function touchFeed(feedId: string, lastUsedAt: Date | null): Promise<void> {
  if (lastUsedAt && Date.now() - lastUsedAt.getTime() < HOUR_MS) return;

  try {
    await db
      .update(schema.calendarFeed)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.calendarFeed.id, feedId));
  } catch (error) {
    // Um poll do calendário não pode falhar por causa de telemetria.
    console.warn("[calendar-feed] Falha ao registrar uso do feed:", error);
  }
}

async function loadDepartmentIds(personId: string): Promise<string[]> {
  const rows = await db
    .select({ departmentId: schema.departmentMember.departmentId })
    .from(schema.departmentMember)
    .where(eq(schema.departmentMember.personId, personId));

  return [...new Set(rows.map((row) => row.departmentId))];
}

async function loadAssignmentLabels(
  personId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<{ eventIds: string[]; labelsByEventId: Map<string, string[]> }> {
  const rows = await db
    .select({
      eventId: schema.schedule.eventId,
      departmentName: schema.department.name,
      functionName: schema.departmentFunction.name,
    })
    .from(schema.scheduleAssignment)
    .innerJoin(schema.schedule, eq(schema.schedule.id, schema.scheduleAssignment.scheduleId))
    .innerJoin(schema.event, eq(schema.event.id, schema.schedule.eventId))
    .innerJoin(
      schema.department,
      eq(schema.department.id, schema.scheduleAssignment.departmentId),
    )
    .innerJoin(
      schema.departmentFunction,
      eq(schema.departmentFunction.id, schema.scheduleAssignment.functionId),
    )
    .where(
      and(
        eq(schema.scheduleAssignment.personId, personId),
        gte(schema.event.startsAt, windowStart),
        lte(schema.event.startsAt, windowEnd),
      ),
    );

  const labelsByEventId = new Map<string, string[]>();
  for (const row of rows) {
    const labels = labelsByEventId.get(row.eventId) ?? [];
    const label = `${row.departmentName} — ${row.functionName}`;
    if (!labels.includes(label)) labels.push(label);
    labelsByEventId.set(row.eventId, labels);
  }

  return { eventIds: [...labelsByEventId.keys()], labelsByEventId };
}

async function loadVisibleEvents(
  feed: PersonalFeedConfig,
  departmentIds: string[],
  assignedEventIds: string[],
  windowStart: Date,
  windowEnd: Date,
): Promise<FeedEventRow[]> {
  const visibility: SQL[] = [];

  if (feed.includeServices) {
    visibility.push(eq(schema.event.kind, "service"));
  }

  if (feed.includeAssignments && assignedEventIds.length > 0) {
    visibility.push(inArray(schema.event.id, assignedEventIds));
  }

  if (departmentIds.length > 0) {
    const departmentEventIds = () =>
      db
        .select({ eventId: schema.eventDepartment.eventId })
        .from(schema.eventDepartment)
        .where(inArray(schema.eventDepartment.departmentId, departmentIds));

    if (feed.includeRehearsals) {
      const rehearsals = and(
        eq(schema.event.kind, "rehearsal"),
        inArray(schema.event.id, departmentEventIds()),
      );
      if (rehearsals) visibility.push(rehearsals);
    }

    if (feed.includeDepartmentEvents) {
      const departmentEvents = and(
        eq(schema.event.kind, "event"),
        inArray(schema.event.id, departmentEventIds()),
      );
      if (departmentEvents) visibility.push(departmentEvents);
    }
  }

  if (visibility.length === 0) return [];

  return db
    .select({
      id: schema.event.id,
      title: schema.event.title,
      kind: schema.event.kind,
      description: schema.event.description,
      location: schema.event.location,
      startsAt: schema.event.startsAt,
      endsAt: schema.event.endsAt,
      updatedAt: schema.event.updatedAt,
    })
    .from(schema.event)
    .where(
      and(
        eq(schema.event.organizationId, feed.organizationId),
        gte(schema.event.startsAt, windowStart),
        lte(schema.event.startsAt, windowEnd),
        or(...visibility),
      ),
    )
    .orderBy(asc(schema.event.startsAt))
    .limit(FEED_MAX_EVENTS);
}

async function loadPerson(
  organizationId: string,
  personId: string,
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: schema.person.id, name: schema.person.name })
    .from(schema.person)
    .where(
      and(
        eq(schema.person.id, personId),
        eq(schema.person.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Resolve o feed pelo token bruto e devolve o ICS pronto. Retorna `null` para
 * token inválido, desconhecido ou revogado — a rota responde 404 nos três casos.
 */
export async function loadPersonalCalendarFeed(
  rawToken: string,
): Promise<LoadedPersonalFeed | null> {
  if (!isPlausibleFeedToken(rawToken)) return null;

  const feed = await findActiveFeedByTokenHash(hashFeedToken(rawToken));
  if (!feed) return null;

  const person = await loadPerson(feed.organizationId, feed.personId);
  if (!person) return null;

  const windowStart = new Date(Date.now() - FEED_PAST_DAYS * DAY_MS);
  const windowEnd = new Date(Date.now() + FEED_FUTURE_DAYS * DAY_MS);

  const [departmentIds, assignments] = await Promise.all([
    loadDepartmentIds(feed.personId),
    feed.includeAssignments
      ? loadAssignmentLabels(feed.personId, windowStart, windowEnd)
      : Promise.resolve({ eventIds: [] as string[], labelsByEventId: new Map() }),
  ]);

  const events = await loadVisibleEvents(
    feed,
    departmentIds,
    assignments.eventIds,
    windowStart,
    windowEnd,
  );

  const items = buildPersonalFeedItems({
    events,
    assignmentsByEventId: assignments.labelsByEventId,
    appBaseUrl: resolveAppBaseUrl(),
  });

  const ics = buildCalendarIcs(items, {
    timeZone: EVENT_TIME_ZONE,
    calendarName: buildFeedCalendarName(person.name),
  });

  await touchFeed(feed.id, feed.lastUsedAt);

  return {
    feedId: feed.id,
    organizationId: feed.organizationId,
    personId: feed.personId,
    ics,
    fileName: "openministry.ics",
  };
}

export type CalendarFeedSummary = {
  id: string;
  label: string | null;
  includeServices: boolean;
  includeRehearsals: boolean;
  includeDepartmentEvents: boolean;
  includeAssignments: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export async function listPersonalFeeds(
  organizationId: string,
  personId: string,
): Promise<CalendarFeedSummary[]> {
  return db
    .select({
      id: schema.calendarFeed.id,
      label: schema.calendarFeed.label,
      includeServices: schema.calendarFeed.includeServices,
      includeRehearsals: schema.calendarFeed.includeRehearsals,
      includeDepartmentEvents: schema.calendarFeed.includeDepartmentEvents,
      includeAssignments: schema.calendarFeed.includeAssignments,
      lastUsedAt: schema.calendarFeed.lastUsedAt,
      createdAt: schema.calendarFeed.createdAt,
    })
    .from(schema.calendarFeed)
    .where(
      and(
        eq(schema.calendarFeed.organizationId, organizationId),
        eq(schema.calendarFeed.personId, personId),
        isNull(schema.calendarFeed.revokedAt),
      ),
    )
    .orderBy(asc(schema.calendarFeed.createdAt));
}

const MAX_ACTIVE_FEEDS_PER_PERSON = 10;

export type CreatedFeed = {
  id: string;
  url: string;
  webcalUrl: string;
};

async function insertFeed(
  organizationId: string,
  personId: string,
  createdByUserId: string | null,
  settings: CalendarFeedSettingsInput,
): Promise<CreatedFeed> {
  const rawToken = generateFeedToken();

  const [row] = await db
    .insert(schema.calendarFeed)
    .values({
      id: randomUUID(),
      organizationId,
      personId,
      tokenHash: hashFeedToken(rawToken),
      label: settings.label?.trim() || null,
      includeServices: settings.includeServices,
      includeRehearsals: settings.includeRehearsals,
      includeDepartmentEvents: settings.includeDepartmentEvents,
      includeAssignments: settings.includeAssignments,
      createdByUserId,
    })
    .returning({ id: schema.calendarFeed.id });

  return { id: row.id, ...buildCalendarFeedUrls(rawToken) };
}

export async function createPersonalFeed(params: {
  organizationId: string;
  personId: string;
  userId: string | null;
  settings: CalendarFeedSettingsInput;
}): Promise<CreatedFeed> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.calendarFeed)
    .where(
      and(
        eq(schema.calendarFeed.organizationId, params.organizationId),
        eq(schema.calendarFeed.personId, params.personId),
        isNull(schema.calendarFeed.revokedAt),
      ),
    );

  if (count >= MAX_ACTIVE_FEEDS_PER_PERSON) {
    throw new Error(
      "Você já tem vários links ativos. Revogue um link antigo antes de criar outro.",
    );
  }

  return insertFeed(
    params.organizationId,
    params.personId,
    params.userId,
    params.settings,
  );
}

export async function rotatePersonalFeed(params: {
  organizationId: string;
  personId: string;
  userId: string | null;
  feedId: string;
}): Promise<CreatedFeed | null> {
  const [current] = await db
    .select({
      id: schema.calendarFeed.id,
      label: schema.calendarFeed.label,
      includeServices: schema.calendarFeed.includeServices,
      includeRehearsals: schema.calendarFeed.includeRehearsals,
      includeDepartmentEvents: schema.calendarFeed.includeDepartmentEvents,
      includeAssignments: schema.calendarFeed.includeAssignments,
    })
    .from(schema.calendarFeed)
    .where(
      and(
        eq(schema.calendarFeed.id, params.feedId),
        eq(schema.calendarFeed.organizationId, params.organizationId),
        eq(schema.calendarFeed.personId, params.personId),
        isNull(schema.calendarFeed.revokedAt),
      ),
    )
    .limit(1);

  if (!current) return null;

  await db
    .update(schema.calendarFeed)
    .set({ revokedAt: new Date() })
    .where(eq(schema.calendarFeed.id, current.id));

  return insertFeed(params.organizationId, params.personId, params.userId, {
    label: current.label,
    includeServices: current.includeServices,
    includeRehearsals: current.includeRehearsals,
    includeDepartmentEvents: current.includeDepartmentEvents,
    includeAssignments: current.includeAssignments,
  });
}

export async function revokePersonalFeed(params: {
  organizationId: string;
  personId: string;
  feedId: string;
}): Promise<boolean> {
  const rows = await db
    .update(schema.calendarFeed)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.calendarFeed.id, params.feedId),
        eq(schema.calendarFeed.organizationId, params.organizationId),
        eq(schema.calendarFeed.personId, params.personId),
        isNull(schema.calendarFeed.revokedAt),
      ),
    )
    .returning({ id: schema.calendarFeed.id });

  return rows.length > 0;
}

export async function updatePersonalFeedSettings(params: {
  organizationId: string;
  personId: string;
  feedId: string;
  settings: CalendarFeedSettingsInput;
}): Promise<boolean> {
  const rows = await db
    .update(schema.calendarFeed)
    .set({
      label: params.settings.label?.trim() || null,
      includeServices: params.settings.includeServices,
      includeRehearsals: params.settings.includeRehearsals,
      includeDepartmentEvents: params.settings.includeDepartmentEvents,
      includeAssignments: params.settings.includeAssignments,
    })
    .where(
      and(
        eq(schema.calendarFeed.id, params.feedId),
        eq(schema.calendarFeed.organizationId, params.organizationId),
        eq(schema.calendarFeed.personId, params.personId),
        isNull(schema.calendarFeed.revokedAt),
      ),
    )
    .returning({ id: schema.calendarFeed.id });

  return rows.length > 0;
}
