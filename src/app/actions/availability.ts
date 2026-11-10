"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  DAYS_OF_WEEK,
  formatDateToYYYYMMDD,
  getPeriodFromDate,
  type DayAvailability,
  type MyAvailabilityResult,
  type PersonUnavailabilityItem,
} from "@/lib/availability";
import { requireOrganizationContext } from "@/lib/organizations";
import { ensurePersonForUser } from "@/lib/people";
import { requirePermission } from "@/lib/permissions/service";
import type { AvailabilityPeriod } from "@/db/schema/people";

export async function getMyAvailabilityAction(): Promise<MyAvailabilityResult | null> {
  const context = await requireOrganizationContext();
  if (!context) return null;
  await requirePermission("schedules", "manageOwnAvailability");

  const person = await ensurePersonForUser(context.organization.id, {
    id: context.session.user.id,
    name: context.session.user.name,
    email: context.session.user.email,
    image: context.session.user.image ?? null,
    birthday: context.session.user.birthday ?? null,
  });

  if (!person) return null;

  const rows = await db.query.personAvailability.findMany({
    where: and(
      eq(schema.personAvailability.organizationId, context.organization.id),
      eq(schema.personAvailability.personId, person.id),
    ),
  });

  const dayMap = new Map(rows.map((r) => [r.dayOfWeek, r]));

  const days: DayAvailability[] = DAYS_OF_WEEK.map((d) => {
    const existing = dayMap.get(d.index);
    return {
      dayOfWeek: d.index,
      periods: (existing?.periods as AvailabilityPeriod[]) || [],
      notes: existing?.notes || null,
    };
  });

  const generalNotes = rows.find((r) => r.notes)?.notes ?? null;

  return {
    personId: person.id,
    days,
    notes: generalNotes,
  };
}

export async function saveMyAvailabilityAction(payload: {
  days: {
    dayOfWeek: number;
    periods: AvailabilityPeriod[];
    notes?: string | null;
  }[];
  generalNotes?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const context = await requireOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }
  await requirePermission("schedules", "manageOwnAvailability");

  const person = await ensurePersonForUser(context.organization.id, {
    id: context.session.user.id,
    name: context.session.user.name,
    email: context.session.user.email,
    image: context.session.user.image ?? null,
    birthday: context.session.user.birthday ?? null,
  });

  if (!person) {
    return { ok: false, error: "Perfil de membro não encontrado." };
  }

  try {
    for (const item of payload.days) {
      const existing = await db.query.personAvailability.findFirst({
        where: and(
          eq(schema.personAvailability.organizationId, context.organization.id),
          eq(schema.personAvailability.personId, person.id),
          eq(schema.personAvailability.dayOfWeek, item.dayOfWeek),
        ),
      });

      const noteToSave = item.notes?.trim() || payload.generalNotes?.trim() || null;

      if (existing) {
        await db
          .update(schema.personAvailability)
          .set({
            periods: item.periods,
            notes: noteToSave,
          })
          .where(eq(schema.personAvailability.id, existing.id));
      } else {
        await db.insert(schema.personAvailability).values({
          id: randomUUID(),
          organizationId: context.organization.id,
          personId: person.id,
          dayOfWeek: item.dayOfWeek,
          periods: item.periods,
          notes: noteToSave,
        });
      }
    }

    revalidatePath("/dashboard/availability");
    revalidatePath("/dashboard/schedules");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("Erro ao salvar disponibilidade:", error);
    return { ok: false, error: "Não foi possível salvar a disponibilidade." };
  }
}

export async function getPersonAvailabilityAction(
  personId: string,
): Promise<DayAvailability[]> {
  const context = await requireOrganizationContext();
  if (!context) return [];
  await requirePermission("schedules", "read");

  const person = await db.query.person.findFirst({
    where: and(
      eq(schema.person.id, personId),
      eq(schema.person.organizationId, context.organization.id),
    ),
  });
  if (!person) return [];

  const rows = await db.query.personAvailability.findMany({
    where: and(
      eq(schema.personAvailability.organizationId, context.organization.id),
      eq(schema.personAvailability.personId, personId),
    ),
  });

  const dayMap = new Map(rows.map((r) => [r.dayOfWeek, r]));

  return DAYS_OF_WEEK.map((d) => {
    const existing = dayMap.get(d.index);
    return {
      dayOfWeek: d.index,
      periods: (existing?.periods as AvailabilityPeriod[]) || [],
      notes: existing?.notes || null,
    };
  });
}

export async function getMyUnavailabilitiesAction(): Promise<PersonUnavailabilityItem[]> {
  const context = await requireOrganizationContext();
  if (!context) return [];
  await requirePermission("schedules", "manageOwnAvailability");

  const person = await ensurePersonForUser(context.organization.id, {
    id: context.session.user.id,
    name: context.session.user.name,
    email: context.session.user.email,
    image: context.session.user.image ?? null,
    birthday: context.session.user.birthday ?? null,
  });

  if (!person) return [];

  const rows = await db.query.personUnavailability.findMany({
    where: and(
      eq(schema.personUnavailability.organizationId, context.organization.id),
      eq(schema.personUnavailability.personId, person.id),
    ),
    orderBy: (table, { asc }) => [asc(table.date)],
  });

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    personId: r.personId,
    date: r.date,
    reason: r.reason,
    allDay: r.allDay,
    periods: (r.periods as AvailabilityPeriod[]) || [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function saveUnavailabilityAction(payload: {
  date: string;
  reason?: string | null;
  allDay?: boolean;
  periods?: AvailabilityPeriod[];
}): Promise<{ ok: boolean; error?: string }> {
  const context = await requireOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }
  await requirePermission("schedules", "manageOwnAvailability");

  const dateTrimmed = payload.date?.trim();
  if (!dateTrimmed || !/^\d{4}-\d{2}-\d{2}$/.test(dateTrimmed)) {
    return { ok: false, error: "Data inválida. Use o formato AAAA-MM-DD." };
  }

  const person = await ensurePersonForUser(context.organization.id, {
    id: context.session.user.id,
    name: context.session.user.name,
    email: context.session.user.email,
    image: context.session.user.image ?? null,
    birthday: context.session.user.birthday ?? null,
  });

  if (!person) {
    return { ok: false, error: "Perfil de membro não encontrado." };
  }

  const isAllDay = payload.allDay ?? true;
  const periods = isAllDay ? [] : payload.periods || [];

  try {
    const existing = await db.query.personUnavailability.findFirst({
      where: and(
        eq(schema.personUnavailability.organizationId, context.organization.id),
        eq(schema.personUnavailability.personId, person.id),
        eq(schema.personUnavailability.date, dateTrimmed),
      ),
    });

    if (existing) {
      await db
        .update(schema.personUnavailability)
        .set({
          reason: payload.reason?.trim() || null,
          allDay: isAllDay,
          periods,
        })
        .where(eq(schema.personUnavailability.id, existing.id));
    } else {
      await db.insert(schema.personUnavailability).values({
        id: randomUUID(),
        organizationId: context.organization.id,
        personId: person.id,
        date: dateTrimmed,
        reason: payload.reason?.trim() || null,
        allDay: isAllDay,
        periods,
      });
    }

    revalidatePath("/dashboard/availability");
    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/schedules");
    revalidatePath("/dashboard/calendar");
    return { ok: true };
  } catch (error) {
    console.error("Erro ao salvar indisponibilidade:", error);
    return { ok: false, error: "Não foi possível registrar o bloqueio de data." };
  }
}

export async function deleteUnavailabilityAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const context = await requireOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }
  await requirePermission("schedules", "manageOwnAvailability");

  const person = await ensurePersonForUser(context.organization.id, {
    id: context.session.user.id,
    name: context.session.user.name,
    email: context.session.user.email,
    image: context.session.user.image ?? null,
    birthday: context.session.user.birthday ?? null,
  });

  if (!person) {
    return { ok: false, error: "Perfil de membro não encontrado." };
  }

  try {
    await db
      .delete(schema.personUnavailability)
      .where(
        and(
          eq(schema.personUnavailability.id, id),
          eq(schema.personUnavailability.organizationId, context.organization.id),
          eq(schema.personUnavailability.personId, person.id),
        ),
      );

    revalidatePath("/dashboard/availability");
    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/schedules");
    revalidatePath("/dashboard/calendar");
    return { ok: true };
  } catch (error) {
    console.error("Erro ao remover indisponibilidade:", error);
    return { ok: false, error: "Não foi possível remover a indisponibilidade." };
  }
}

export async function checkPersonAvailabilityForEventAction(
  personId: string,
  eventStartsAt: Date,
): Promise<{
  isAvailable: boolean;
  isBlocked: boolean;
  blockedReason?: string | null;
  dayOfWeek: number;
  period: AvailabilityPeriod;
  notes?: string | null;
}> {
  await requireOrganizationContext();
  await requirePermission("schedules", "read");

  const dateStr = formatDateToYYYYMMDD(eventStartsAt);
  const dayOfWeek = eventStartsAt.getDay();
  const period = getPeriodFromDate(eventStartsAt);

  // Check specific blocked date first
  const blockedDate = await db.query.personUnavailability.findFirst({
    where: and(
      eq(schema.personUnavailability.personId, personId),
      eq(schema.personUnavailability.date, dateStr),
    ),
  });

  if (blockedDate) {
    const periods = (blockedDate.periods as AvailabilityPeriod[]) || [];
    const isBlocked = blockedDate.allDay || periods.includes(period);
    if (isBlocked) {
      return {
        isAvailable: false,
        isBlocked: true,
        blockedReason:
          blockedDate.reason || "Indisponibilidade pontual registrada para esta data",
        dayOfWeek,
        period,
      };
    }
  }

  // Check recurring weekly availability
  const weekly = await db.query.personAvailability.findFirst({
    where: and(
      eq(schema.personAvailability.personId, personId),
      eq(schema.personAvailability.dayOfWeek, dayOfWeek),
    ),
  });

  if (!weekly) {
    return { isAvailable: false, isBlocked: false, dayOfWeek, period };
  }

  const weeklyPeriods = (weekly.periods as AvailabilityPeriod[]) || [];
  const isAvailable = weeklyPeriods.includes(period);

  return {
    isAvailable,
    isBlocked: false,
    dayOfWeek,
    period,
    notes: weekly.notes,
  };
}

export async function getEventUnavailablePeopleAction(
  eventId: string,
): Promise<Record<string, { isBlocked: boolean; reason?: string | null }>> {
  const context = await requireOrganizationContext();
  if (!context) return {};
  await requirePermission("schedules", "read");

  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.id, eventId),
      eq(schema.event.organizationId, context.organization.id),
    ),
  });

  if (!event) return {};

  const dateStr = formatDateToYYYYMMDD(event.startsAt);
  const period = getPeriodFromDate(event.startsAt);

  const blockedRows = await db.query.personUnavailability.findMany({
    where: and(
      eq(schema.personUnavailability.organizationId, context.organization.id),
      eq(schema.personUnavailability.date, dateStr),
    ),
  });

  const result: Record<string, { isBlocked: boolean; reason?: string | null }> = {};

  for (const row of blockedRows) {
    const periods = (row.periods as AvailabilityPeriod[]) || [];
    if (row.allDay || periods.includes(period)) {
      result[row.personId] = {
        isBlocked: true,
        reason: row.reason || "Indisponível nesta data",
      };
    }
  }

  return result;
}
