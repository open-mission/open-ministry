import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { formatEventFullDate, formatEventTime } from "@/lib/events";
import { dispatchNotification } from "@/lib/notification-service";
import {
  cancelScheduledQStashMessage,
  scheduleRehearsalReminderJob,
} from "@/lib/queue";
import {
  buildRehearsalRemindersToSchedule,
  type RehearsalAlertRule,
} from "@/features/rehearsals/lib/rehearsal-alerts";
import { REHEARSAL_NOTIFICATION_CHANNELS } from "./rehearsal-schemas";
import {
  getOrSeedDepartmentAlertRules,
  toRuleInput,
  type RehearsalEventRow,
} from "./rehearsal-shared";

export type { RehearsalEventRow } from "./rehearsal-shared";

/* Agendamento e processamento de lembretes */
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
  description?: string | null;
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
  const href = `/events/${event.id}`;
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
          departmentName: department.name,
          songs,
          notes: event.description?.trim() || undefined,
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
        description: event.description,
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

export {
  cancelPendingReminders,
  persistAndScheduleReminders,
  dispatchRehearsalToMembers,
};
