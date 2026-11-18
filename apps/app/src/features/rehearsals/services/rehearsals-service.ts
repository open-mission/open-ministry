import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags, remember } from "@/lib/cache";
import { formatEventFullDate, formatEventTime } from "@/lib/events";
import { dispatchNotification } from "@/lib/notification-service";
import {
  cancelScheduledQStashMessage,
  scheduleRehearsalReminderJob,
} from "@/lib/queue";
import {
  buildRehearsalRemindersToSchedule,
  DEFAULT_REHEARSAL_ALERTS,
  type RehearsalAlertRule,
} from "@/features/rehearsals/lib/rehearsal-alerts";

export {
  getAccessibleRehearsalDepartments,
  listAccessibleRehearsals,
  type AccessibleRehearsalDepartment,
} from "@/features/rehearsals/services/rehearsals-global-service";

const REHEARSAL_NOTIFICATION_CHANNELS = [
  "in_app",
  "push",
  "whatsapp",
  "email",
] as const;

export const rehearsalAlertRuleInputSchema = z
  .object({
    id: z.string().min(1).nullish(),
    label: z.string().trim().min(1).max(120),
    triggerType: z.enum(["offset_minutes", "day_of_at_time"]),
    offsetMinutes: z.number().int().min(0).max(60 * 24 * 60).nullish(),
    timeOfDay: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (use HH:mm).")
      .nullish(),
    channels: z
      .array(z.enum(REHEARSAL_NOTIFICATION_CHANNELS))
      .min(1, "Selecione pelo menos um canal.")
      .max(REHEARSAL_NOTIFICATION_CHANNELS.length),
    enabled: z.boolean().optional(),
  })
  .superRefine((rule, ctx) => {
    if (rule.triggerType === "offset_minutes" && rule.offsetMinutes == null) {
      ctx.addIssue({
        code: "custom",
        message: "Informe os minutos de antecedência.",
        path: ["offsetMinutes"],
      });
    }
    if (rule.triggerType === "day_of_at_time" && !rule.timeOfDay) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o horário do dia.",
        path: ["timeOfDay"],
      });
    }
  });

export const saveRehearsalAlertRulesSchema = z.object({
  rules: z.array(rehearsalAlertRuleInputSchema).min(1).max(20),
});

const rehearsalSongInputSchema = z.object({
  songId: z.string().min(1, "Selecione uma música."),
  musicalKey: z.string().trim().max(12).nullish(),
  notes: z.string().trim().max(500).nullish(),
});

const rehearsalBaseSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(160),
  description: z.string().trim().max(2000).nullish(),
  location: z.string().trim().max(200).nullish(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullish(),
  durationMinutes: z.number().int().min(1).max(24 * 60).nullish(),
  songs: z.array(rehearsalSongInputSchema).max(100).optional(),
  notifyImmediately: z.boolean().optional(),
  alertRules: z.array(rehearsalAlertRuleInputSchema).max(20).nullish(),
});

export const createRehearsalSchema = rehearsalBaseSchema;

export const updateRehearsalSchema = rehearsalBaseSchema.partial();

export type CreateRehearsalInput = z.infer<typeof createRehearsalSchema>;
export type UpdateRehearsalInput = z.infer<typeof updateRehearsalSchema>;
export type RehearsalAlertRuleInput = z.infer<
  typeof rehearsalAlertRuleInputSchema
>;

export type DepartmentRehearsalAlertRow =
  typeof schema.departmentRehearsalAlert.$inferSelect;

type RehearsalEventRow = typeof schema.event.$inferSelect;

async function requireDepartment(
  organizationId: string,
  departmentId: string,
) {
  const department = await db.query.department.findFirst({
    where: and(
      eq(schema.department.id, departmentId),
      eq(schema.department.organizationId, organizationId),
    ),
    columns: { id: true, name: true, organizationId: true },
  });

  if (!department) {
    throw new Error("Departamento não encontrado.");
  }

  return department;
}

function toRuleInput(rule: DepartmentRehearsalAlertRow): RehearsalAlertRule {
  return {
    id: rule.id,
    label: rule.label,
    triggerType: rule.triggerType,
    offsetMinutes: rule.offsetMinutes,
    timeOfDay: rule.timeOfDay,
    channels: rule.channels,
    enabled: rule.enabled,
    isDefault: rule.isDefault,
    sortOrder: rule.sortOrder,
  };
}

function cacheTags(organizationId: string, departmentId: string) {
  return [
    `events:${organizationId}`,
    `departments:${organizationId}`,
    `rehearsals:${organizationId}:all`,
    `rehearsals:${organizationId}:${departmentId}`,
  ];
}

async function invalidateRehearsalCaches(
  organizationId: string,
  departmentId: string,
  eventId?: string,
) {
  const tags = cacheTags(organizationId, departmentId);
  if (eventId) {
    tags.push(`event:${eventId}`, `rehearsal:${eventId}`);
  }
  await cacheInvalidateTags(...tags);
}

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
/*                         Regras de lembrete do setor                        */
/* -------------------------------------------------------------------------- */

export async function getOrSeedDepartmentAlertRules(
  organizationId: string,
  departmentId: string,
): Promise<DepartmentRehearsalAlertRow[]> {
  await requireDepartment(organizationId, departmentId);

  const existing = await db.query.departmentRehearsalAlert.findMany({
    where: and(
      eq(schema.departmentRehearsalAlert.organizationId, organizationId),
      eq(schema.departmentRehearsalAlert.departmentId, departmentId),
    ),
    orderBy: (table, { asc: ascending }) => [
      ascending(table.sortOrder),
      ascending(table.createdAt),
    ],
  });

  if (existing.length > 0) {
    return existing;
  }

  await db
    .insert(schema.departmentRehearsalAlert)
    .values(
      DEFAULT_REHEARSAL_ALERTS.map((rule, index) => ({
        id: randomUUID(),
        organizationId,
        departmentId,
        label: rule.label,
        triggerType: rule.triggerType,
        offsetMinutes: rule.offsetMinutes ?? null,
        timeOfDay: rule.timeOfDay ?? null,
        channels: rule.channels,
        enabled: rule.enabled ?? true,
        isDefault: true,
        sortOrder: rule.sortOrder ?? index,
      })),
    )
    .onConflictDoNothing();

  return db.query.departmentRehearsalAlert.findMany({
    where: and(
      eq(schema.departmentRehearsalAlert.organizationId, organizationId),
      eq(schema.departmentRehearsalAlert.departmentId, departmentId),
    ),
    orderBy: (table, { asc: ascending }) => [
      ascending(table.sortOrder),
      ascending(table.createdAt),
    ],
  });
}

export async function saveDepartmentAlertRules(
  organizationId: string,
  departmentId: string,
  rules: unknown,
): Promise<DepartmentRehearsalAlertRow[]> {
  const parsed = saveRehearsalAlertRulesSchema.parse({ rules });
  await requireDepartment(organizationId, departmentId);

  const existing = await db.query.departmentRehearsalAlert.findMany({
    where: and(
      eq(schema.departmentRehearsalAlert.organizationId, organizationId),
      eq(schema.departmentRehearsalAlert.departmentId, departmentId),
    ),
    columns: { id: true },
  });
  const existingIds = new Set(existing.map((rule) => rule.id));

  const keptIds: string[] = [];
  for (const [index, rule] of parsed.rules.entries()) {
    const values = {
      label: rule.label,
      triggerType: rule.triggerType,
      offsetMinutes:
        rule.triggerType === "offset_minutes"
          ? (rule.offsetMinutes ?? 0)
          : null,
      timeOfDay:
        rule.triggerType === "day_of_at_time" ? (rule.timeOfDay ?? null) : null,
      channels: rule.channels,
      enabled: rule.enabled ?? true,
      sortOrder: index,
      updatedAt: new Date(),
    };

    if (rule.id && existingIds.has(rule.id)) {
      await db
        .update(schema.departmentRehearsalAlert)
        .set(values)
        .where(
          and(
            eq(schema.departmentRehearsalAlert.id, rule.id),
            eq(schema.departmentRehearsalAlert.departmentId, departmentId),
          ),
        );
      keptIds.push(rule.id);
    } else {
      const id = randomUUID();
      await db.insert(schema.departmentRehearsalAlert).values({
        id,
        organizationId,
        departmentId,
        ...values,
      });
      keptIds.push(id);
    }
  }

  const removedIds = [...existingIds].filter((id) => !keptIds.includes(id));
  if (removedIds.length > 0) {
    await db
      .delete(schema.departmentRehearsalAlert)
      .where(inArray(schema.departmentRehearsalAlert.id, removedIds));
  }

  await rescheduleDepartmentReminders(organizationId, departmentId);
  await invalidateRehearsalCaches(organizationId, departmentId);

  return getOrSeedDepartmentAlertRules(organizationId, departmentId);
}

export async function resetDepartmentAlertRules(
  organizationId: string,
  departmentId: string,
) {
  await requireDepartment(organizationId, departmentId);

  await db
    .delete(schema.departmentRehearsalAlert)
    .where(
      and(
        eq(schema.departmentRehearsalAlert.organizationId, organizationId),
        eq(schema.departmentRehearsalAlert.departmentId, departmentId),
      ),
    );

  const rules = await getOrSeedDepartmentAlertRules(
    organizationId,
    departmentId,
  );

  await rescheduleDepartmentReminders(organizationId, departmentId);
  await invalidateRehearsalCaches(organizationId, departmentId);

  return rules;
}

/* -------------------------------------------------------------------------- */
/*                         Agendamento de lembretes                           */
/* -------------------------------------------------------------------------- */

async function cancelPendingReminders(eventIds: string[]) {
  if (eventIds.length === 0) return;

  const pending = await db.query.rehearsalReminder.findMany({
    where: and(
      inArray(schema.rehearsalReminder.eventId, eventIds),
      eq(schema.rehearsalReminder.status, "pending"),
    ),
    columns: { id: true, qstashMessageId: true },
  });

  await Promise.all(
    pending
      .filter((reminder) => Boolean(reminder.qstashMessageId))
      .map((reminder) =>
        cancelScheduledQStashMessage(reminder.qstashMessageId!),
      ),
  );

  if (pending.length > 0) {
    await db.delete(schema.rehearsalReminder).where(
      and(
        inArray(
          schema.rehearsalReminder.id,
          pending.map((reminder) => reminder.id),
        ),
        eq(schema.rehearsalReminder.status, "pending"),
      ),
    );
  }
}

async function persistAndScheduleReminders(
  event: Pick<
    RehearsalEventRow,
    "id" | "organizationId" | "title" | "startsAt"
  >,
  departmentId: string,
  rules: RehearsalAlertRule[],
  now: Date = new Date(),
) {
  const plans = buildRehearsalRemindersToSchedule(
    {
      id: event.id,
      organizationId: event.organizationId,
      departmentId,
      startsAt: event.startsAt,
    },
    rules,
    now,
  );

  if (plans.length === 0) return 0;

  const inserted = await db
    .insert(schema.rehearsalReminder)
    .values(
      plans.map((plan) => ({
        id: randomUUID(),
        organizationId: event.organizationId,
        eventId: event.id,
        departmentId,
        alertRuleId: plan.alertRuleId,
        label: plan.label,
        scheduledFor: plan.scheduledFor,
        channels: plan.channels,
        status: "pending",
        dedupeKey: plan.dedupeKey,
      })),
    )
    .onConflictDoNothing({ target: schema.rehearsalReminder.dedupeKey })
    .returning({
      id: schema.rehearsalReminder.id,
      scheduledFor: schema.rehearsalReminder.scheduledFor,
      dedupeKey: schema.rehearsalReminder.dedupeKey,
    });

  await Promise.all(
    inserted.map(async (reminder) => {
      const messageId = await scheduleRehearsalReminderJob({
        reminderId: reminder.id,
        organizationId: event.organizationId,
        deliverAt: reminder.scheduledFor,
        dedupeKey: reminder.dedupeKey,
      });

      if (messageId) {
        await db
          .update(schema.rehearsalReminder)
          .set({ qstashMessageId: messageId })
          .where(eq(schema.rehearsalReminder.id, reminder.id));
      }
    }),
  );

  return inserted.length;
}

async function listUpcomingDepartmentRehearsals(
  organizationId: string,
  departmentId: string,
  now: Date,
) {
  const cutoff = new Date(now.getTime() - 2 * 60 * 1000);

  return db
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
        gte(schema.event.startsAt, cutoff),
      ),
    );
}

/**
 * Cancela os lembretes pendentes de ensaios futuros do departamento e os
 * recria com as regras atualmente configuradas.
 */
export async function rescheduleDepartmentReminders(
  organizationId: string,
  departmentId: string,
  now: Date = new Date(),
) {
  const rules = await getOrSeedDepartmentAlertRules(
    organizationId,
    departmentId,
  );
  const events = await listUpcomingDepartmentRehearsals(
    organizationId,
    departmentId,
    now,
  );

  if (events.length === 0) return 0;

  await cancelPendingReminders(events.map((row) => row.event.id));

  let created = 0;
  for (const row of events) {
    created += await persistAndScheduleReminders(
      row.event,
      departmentId,
      rules.map(toRuleInput),
      now,
    );
  }

  return created;
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

async function loadDepartmentMembersWithContact(departmentId: string) {
  return db.query.departmentMember.findMany({
    where: eq(schema.departmentMember.departmentId, departmentId),
    with: {
      person: {
        with: { user: true },
      },
    },
  });
}

type RehearsalNotificationEvent = {
  id: string;
  organizationId: string;
  title: string;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
};

function resolveNotificationChannels(channels: string[] | null | undefined) {
  const allowed = new Set<string>(REHEARSAL_NOTIFICATION_CHANNELS);
  const filtered = (channels ?? []).filter((channel) => allowed.has(channel));
  return filtered.length > 0
    ? (filtered as (typeof REHEARSAL_NOTIFICATION_CHANNELS)[number][])
    : [...REHEARSAL_NOTIFICATION_CHANNELS];
}

async function dispatchRehearsalToMembers(
  event: RehearsalNotificationEvent,
  department: { id: string; name: string },
  channels: string[] = [...REHEARSAL_NOTIFICATION_CHANNELS],
) {
  const notificationChannels = resolveNotificationChannels(channels);
  const [members, songRows] = await Promise.all([
    loadDepartmentMembersWithContact(department.id),
    db.query.rehearsalSong.findMany({
      where: eq(schema.rehearsalSong.eventId, event.id),
      with: { song: true },
      orderBy: (table, { asc: ascending }) => [ascending(table.order)],
    }),
  ]);

  if (members.length === 0) return { sent: 0, failed: 0 };

  const songs = songRows.map((row) =>
    row.musicalKey
      ? `${row.song.title} (${row.musicalKey})`
      : row.song.title,
  );
  const eventDate = formatEventFullDate(event.startsAt);
  const eventTime = formatEventTime(event.startsAt);
  const href = `/dashboard/events/${event.id}`;
  const songsSummary =
    songs.length > 0 ? ` · Músicas: ${songs.join(", ")}` : "";
  const body = `Ensaio de ${department.name} em ${eventDate} às ${eventTime}${event.location ? ` · ${event.location}` : ""}${songsSummary}.`;

  const results = await Promise.allSettled(
    members.map((member) => {
      const person = member.person;
      return dispatchNotification({
        organizationId: event.organizationId,
        type: "rehearsal_reminder",
        title: `Ensaio: ${event.title}`,
        body,
        href,
        userId: person.userId ?? null,
        personId: person.id,
        phone: person.phone ?? person.user?.phone ?? null,
        email: person.email ?? person.user?.email ?? null,
        name: person.name,
        channels: notificationChannels,
        metadata: {
          eventTitle: event.title,
          eventDate,
          eventTime,
          location: event.location,
          songs,
          link: href,
        },
      });
    }),
  );

  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
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

/* -------------------------------------------------------------------------- */
/*                          Processamento de lembretes                        */
/* -------------------------------------------------------------------------- */

export type RehearsalReminderDispatchResult = {
  ok: boolean;
  reminderId: string;
  status: "sent" | "failed" | "skipped";
  sent?: number;
  failed?: number;
  error?: string;
};

export async function dispatchRehearsalReminder(
  reminderId: string,
): Promise<RehearsalReminderDispatchResult> {
  const claimed = await db
    .update(schema.rehearsalReminder)
    .set({ status: "processing", updatedAt: new Date() })
    .where(
      and(
        eq(schema.rehearsalReminder.id, reminderId),
        eq(schema.rehearsalReminder.status, "pending"),
      ),
    )
    .returning();

  if (claimed.length === 0) {
    return { ok: true, reminderId, status: "skipped" };
  }

  const reminder = claimed[0];

  try {
    const [event, department] = await Promise.all([
      db.query.event.findFirst({
        where: and(
          eq(schema.event.id, reminder.eventId),
          eq(schema.event.organizationId, reminder.organizationId),
        ),
      }),
      db.query.department.findFirst({
        where: eq(schema.department.id, reminder.departmentId),
        columns: { id: true, name: true },
      }),
    ]);

    if (!event || !department) {
      await db
        .update(schema.rehearsalReminder)
        .set({
          status: "failed",
          errorMessage: "Ensaio ou departamento não encontrado.",
          updatedAt: new Date(),
        })
        .where(eq(schema.rehearsalReminder.id, reminder.id));

      return {
        ok: false,
        reminderId,
        status: "failed",
        error: "Ensaio ou departamento não encontrado.",
      };
    }

    const { sent, failed } = await dispatchRehearsalToMembers(
      {
        id: event.id,
        organizationId: event.organizationId,
        title: event.title,
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      },
      department,
      reminder.channels,
    );

    await db
      .update(schema.rehearsalReminder)
      .set({
        status: "sent",
        sentAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.rehearsalReminder.id, reminder.id));

    return { ok: true, reminderId, status: "sent", sent, failed };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao enviar lembrete.";

    await db
      .update(schema.rehearsalReminder)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(eq(schema.rehearsalReminder.id, reminder.id))
      .catch(() => undefined);

    return { ok: false, reminderId, status: "failed", error: message };
  }
}

export async function sweepDueRehearsalReminders(
  now: Date = new Date(),
  limit = 100,
) {
  const due = await db.query.rehearsalReminder.findMany({
    where: and(
      eq(schema.rehearsalReminder.status, "pending"),
      lte(schema.rehearsalReminder.scheduledFor, now),
    ),
    orderBy: (table, { asc: ascending }) => [
      ascending(table.scheduledFor),
    ],
    columns: { id: true },
    limit,
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    const result = await dispatchRehearsalReminder(reminder.id);
    if (result.status === "sent") sent += 1;
    if (result.status === "failed") failed += 1;
  }

  return { processed: due.length, sent, failed };
}
