import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import type { RehearsalAlertRule } from "@/features/rehearsals/lib/rehearsal-alerts";
import { getOrSeedDepartmentAlertRules } from "./rehearsal-alert-rules";
import {
  cancelPendingReminders,
  dispatchRehearsalToMembers,
  persistAndScheduleReminders,
} from "./rehearsal-reminders";
import {
  createRehearsalSchema,
  updateRehearsalSchema,
  type CreateRehearsalInput,
  type RehearsalAlertRuleInput,
  type DepartmentRehearsalAlertRow,
} from "./rehearsal-schemas";
import {
  invalidateRehearsalCaches,
  requireDepartment,
  toRuleInput,
} from "./rehearsal-shared";

export {
  getAccessibleRehearsalDepartments,
  listAccessibleRehearsals,
  type AccessibleRehearsalDepartment,
} from "@/features/rehearsals/services/rehearsals-global-service";
export * from "./rehearsal-schemas";
export {
  getOrSeedDepartmentAlertRules,
  saveDepartmentAlertRules,
  resetDepartmentAlertRules,
} from "./rehearsal-alert-rules";
export {
  rescheduleDepartmentReminders,
  dispatchRehearsalReminder,
  sweepDueRehearsalReminders,
  type RehearsalReminderDispatchResult,
} from "./rehearsal-reminders";

/* -------------------------------------------------------------------------- */
/*                                  Leitura                                   */
/* -------------------------------------------------------------------------- */

export async function listDepartmentRehearsals(
  organizationId: string,
  departmentId: string,
) {
  return remember(
    `rehearsals:${organizationId}:${departmentId}`,
    30,
    async () => {
      const rows = await db
        .select({ event: schema.event })
        .from(schema.event)
        .innerJoin(
          schema.eventDepartment,
          and(
            eq(schema.eventDepartment.eventId, schema.event.id),
            eq(schema.eventDepartment.departmentId, departmentId),
          ),
        )
        .where(
          and(
            eq(schema.event.organizationId, organizationId),
            eq(schema.event.kind, "rehearsal"),
          ),
        )
        .orderBy(desc(schema.event.startsAt))
        .limit(200);

      if (rows.length === 0) {
        return [];
      }

      const eventIds = rows.map((row) => row.event.id);
      const songs = await db.query.rehearsalSong.findMany({
        where: inArray(schema.rehearsalSong.eventId, eventIds),
        with: { song: true },
        orderBy: (table, { asc: ascending }) => [
          ascending(table.order),
          ascending(table.createdAt),
        ],
      });

      const songsByEvent = new Map<
        string,
        (typeof songs)[number][]
      >();
      for (const song of songs) {
        const list = songsByEvent.get(song.eventId) ?? [];
        list.push(song);
        songsByEvent.set(song.eventId, list);
      }

      return rows.map((row) => ({
        ...row.event,
        songs: songsByEvent.get(row.event.id) ?? [],
      }));
    },
    [`rehearsals:${organizationId}:${departmentId}`, `events:${organizationId}`],
  );
}

export async function getRehearsalById(
  organizationId: string,
  eventId: string,
) {
  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.id, eventId),
      eq(schema.event.organizationId, organizationId),
      eq(schema.event.kind, "rehearsal"),
    ),
  });

  if (!event) {
    return null;
  }

  const [songs, departments] = await Promise.all([
    db.query.rehearsalSong.findMany({
      where: eq(schema.rehearsalSong.eventId, eventId),
      with: { song: true },
      orderBy: (table, { asc: ascending }) => [
        ascending(table.order),
        ascending(table.createdAt),
      ],
    }),
    db.query.eventDepartment.findMany({
      where: eq(schema.eventDepartment.eventId, eventId),
      with: { department: true },
    }),
  ]);

  return { ...event, songs, departments };
}

/* -------------------------------------------------------------------------- */
/*                              CRUD de ensaios                               */
/* -------------------------------------------------------------------------- */

async function validateSongIds(
  organizationId: string,
  songs: NonNullable<CreateRehearsalInput["songs"]>,
) {
  const ids = [...new Set(songs.map((song) => song.songId))];
  if (ids.length === 0) return;

  const found = await db.query.song.findMany({
    where: and(
      eq(schema.song.organizationId, organizationId),
      inArray(schema.song.id, ids),
    ),
    columns: { id: true },
  });
  const foundIds = new Set(found.map((song) => song.id));
  const missing = ids.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    throw new Error("Uma ou mais músicas selecionadas não foram encontradas.");
  }
}

async function replaceRehearsalSongs(
  eventId: string,
  songs: NonNullable<CreateRehearsalInput["songs"]>,
) {
  await db
    .delete(schema.rehearsalSong)
    .where(eq(schema.rehearsalSong.eventId, eventId));

  const unique = new Map<string, (typeof songs)[number]>();
  for (const song of songs) {
    if (!unique.has(song.songId)) {
      unique.set(song.songId, song);
    }
  }

  if (unique.size === 0) return;

  await db.insert(schema.rehearsalSong).values(
    [...unique.values()].map((song, index) => ({
      id: randomUUID(),
      eventId,
      songId: song.songId,
      order: index,
      musicalKey: song.musicalKey ?? null,
      notes: song.notes ?? null,
    })),
  );
}

function resolveRules(
  overrideRules: RehearsalAlertRuleInput[] | null | undefined,
  departmentRules: DepartmentRehearsalAlertRow[],
): RehearsalAlertRule[] {
  if (overrideRules && overrideRules.length > 0) {
    return overrideRules.map((rule, index) => ({
      id: null,
      label: rule.label,
      triggerType: rule.triggerType,
      offsetMinutes: rule.offsetMinutes ?? null,
      timeOfDay: rule.timeOfDay ?? null,
      channels: rule.channels,
      enabled: rule.enabled ?? true,
      sortOrder: index,
    }));
  }

  return departmentRules.map(toRuleInput);
}

export async function createRehearsal(
  organizationId: string,
  departmentId: string,
  input: unknown,
) {
  const parsed = createRehearsalSchema.parse(input);
  const department = await requireDepartment(organizationId, departmentId);

  const songs = parsed.songs ?? [];
  await validateSongIds(organizationId, songs);

  const eventId = randomUUID();
  const startsAt = parsed.startsAt;
  const endsAt =
    parsed.endsAt ??
    new Date(
      startsAt.getTime() + (parsed.durationMinutes ?? 90) * 60 * 1000,
    );

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("O término do ensaio precisa ser depois do início.");
  }

  const departmentRules = await getOrSeedDepartmentAlertRules(
    organizationId,
    departmentId,
  );

  await db.insert(schema.event).values({
    id: eventId,
    organizationId,
    title: parsed.title,
    description: parsed.description ?? null,
    kind: "rehearsal",
    location: parsed.location ?? null,
    startsAt,
    endsAt,
  });

  try {
    await db.insert(schema.eventDepartment).values({
      id: randomUUID(),
      eventId,
      departmentId,
    });

    await replaceRehearsalSongs(eventId, songs);

    await persistAndScheduleReminders(
      { id: eventId, organizationId, title: parsed.title, startsAt },
      departmentId,
      resolveRules(parsed.alertRules, departmentRules),
    );
  } catch (error) {
    await db
      .delete(schema.event)
      .where(eq(schema.event.id, eventId))
      .catch(() => undefined);
    throw error;
  }

  if (parsed.notifyImmediately) {
    await dispatchRehearsalToMembers(
      {
        id: eventId,
        organizationId,
        title: parsed.title,
        description: parsed.description ?? null,
        location: parsed.location ?? null,
        startsAt,
        endsAt,
      },
      department,
      ["in_app", "push"],
    ).catch((error) => {
      console.error("Falha ao enviar aviso imediato do ensaio:", error);
    });
  }

  await invalidateRehearsalCaches(organizationId, departmentId, eventId);

  return getRehearsalById(organizationId, eventId);
}

async function requireDepartmentRehearsal(
  organizationId: string,
  departmentId: string,
  eventId: string,
) {
  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.id, eventId),
      eq(schema.event.organizationId, organizationId),
      eq(schema.event.kind, "rehearsal"),
    ),
  });

  if (!event) {
    throw new Error("Ensaio não encontrado.");
  }

  const link = await db.query.eventDepartment.findFirst({
    where: and(
      eq(schema.eventDepartment.eventId, eventId),
      eq(schema.eventDepartment.departmentId, departmentId),
    ),
    columns: { id: true },
  });

  if (!link) {
    throw new Error("Este ensaio não pertence ao departamento informado.");
  }

  return event;
}

export async function updateRehearsal(
  organizationId: string,
  departmentId: string,
  eventId: string,
  input: unknown,
) {
  const parsed = updateRehearsalSchema.parse(input);
  const department = await requireDepartment(organizationId, departmentId);
  const current = await requireDepartmentRehearsal(
    organizationId,
    departmentId,
    eventId,
  );

  if (parsed.songs) {
    await validateSongIds(organizationId, parsed.songs);
  }

  const startsAt = parsed.startsAt ?? current.startsAt;
  const endsAt =
    parsed.endsAt ??
    (parsed.durationMinutes
      ? new Date(startsAt.getTime() + parsed.durationMinutes * 60 * 1000)
      : parsed.startsAt
        ? new Date(
            startsAt.getTime() +
              Math.max(
                60 * 1000,
                current.endsAt.getTime() - current.startsAt.getTime(),
              ),
          )
        : current.endsAt);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("O término do ensaio precisa ser depois do início.");
  }

  await db
    .update(schema.event)
    .set({
      ...(parsed.title !== undefined ? { title: parsed.title } : {}),
      ...(parsed.description !== undefined
        ? { description: parsed.description ?? null }
        : {}),
      ...(parsed.location !== undefined
        ? { location: parsed.location ?? null }
        : {}),
      startsAt,
      endsAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.event.id, eventId));

  if (parsed.songs) {
    await replaceRehearsalSongs(eventId, parsed.songs);
  }

  const departmentRules = await getOrSeedDepartmentAlertRules(
    organizationId,
    departmentId,
  );

  await cancelPendingReminders([eventId]);
  await persistAndScheduleReminders(
    {
      id: eventId,
      organizationId,
      title: parsed.title ?? current.title,
      startsAt,
    },
    departmentId,
    resolveRules(parsed.alertRules, departmentRules),
  );

  if (parsed.notifyImmediately) {
    await dispatchRehearsalToMembers(
      {
        id: eventId,
        organizationId,
        title: parsed.title ?? current.title,
        description:
          parsed.description !== undefined
            ? (parsed.description ?? null)
            : current.description,
        location: parsed.location ?? current.location,
        startsAt,
        endsAt,
      },
      department,
      ["in_app", "push"],
    ).catch((error) => {
      console.error("Falha ao enviar aviso imediato do ensaio:", error);
    });
  }

  await invalidateRehearsalCaches(organizationId, departmentId, eventId);

  return getRehearsalById(organizationId, eventId);
}

export async function deleteRehearsal(
  organizationId: string,
  departmentId: string,
  eventId: string,
) {
  await requireDepartment(organizationId, departmentId);
  await requireDepartmentRehearsal(organizationId, departmentId, eventId);

  await cancelPendingReminders([eventId]);

  await db
    .delete(schema.event)
    .where(
      and(
        eq(schema.event.id, eventId),
        eq(schema.event.organizationId, organizationId),
      ),
    );

  await invalidateRehearsalCaches(organizationId, departmentId, eventId);

  return { ok: true as const, eventId };
}
