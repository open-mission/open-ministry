"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  DAYS_OF_WEEK,
  formatDateToYYYYMMDD,
  getPeriodFromDate,
  type DayAvailability,
  type DeleteUnavailabilityResult,
  type MyAvailabilityResult,
  type PersonUnavailabilityItem,
  type SaveMyAvailabilityResult,
  type SaveUnavailabilityResult,
} from "@/lib/availability";
import { requireOrganizationContext } from "@/lib/organizations";
import { ensurePersonForUser } from "@/lib/people";
import { requirePermission } from "@/lib/permissions/service";
import type { AvailabilityPeriod } from "@/db/schema/people";

const VALID_PERIODS: AvailabilityPeriod[] = [
  "morning",
  "afternoon",
  "evening",
];

/** Keeps known periods, removes duplicates and restores a stable order. */
function normalizePeriods(value: unknown): AvailabilityPeriod[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const unique = new Set<AvailabilityPeriod>();
  for (const period of value) {
    if (!VALID_PERIODS.includes(period as AvailabilityPeriod)) return null;
    unique.add(period as AvailabilityPeriod);
  }

  return VALID_PERIODS.filter((period) => unique.has(period));
}

function toUnavailabilityItem(row: {
  id: string;
  organizationId: string;
  personId: string;
  date: string;
  reason: string | null;
  allDay: boolean;
  periods: AvailabilityPeriod[];
  createdAt: Date;
  updatedAt: Date;
}): PersonUnavailabilityItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    personId: row.personId,
    date: row.date,
    reason: row.reason,
    allDay: row.allDay,
    periods: row.periods,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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

  const dayMap = new Map(rows.map((row) => [row.dayOfWeek, row]));

  const days: DayAvailability[] = DAYS_OF_WEEK.map((day) => {
    const existing = dayMap.get(day.index);
    return {
      dayOfWeek: day.index,
      periods: (existing?.periods as AvailabilityPeriod[]) || [],
      notes: existing?.notes || null,
      informed: Boolean(existing),
      updatedAt: existing?.updatedAt ?? null,
    };
  });

  const generalNotes = rows.find((row) => row.notes)?.notes ?? null;
  const updatedAt = rows.reduce<Date | null>((latest, row) => {
    if (!latest || row.updatedAt > latest) return row.updatedAt;
    return latest;
  }, null);

  return {
    personId: person.id,
    days,
    notes: generalNotes,
    hasSaved: rows.length > 0,
    updatedAt,
  };
}

export async function saveMyAvailabilityAction(payload: {
  days: {
    dayOfWeek: number;
    periods: AvailabilityPeriod[];
    notes?: string | null;
  }[];
  generalNotes?: string | null;
}): Promise<SaveMyAvailabilityResult> {
  const context = await requireOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }
  await requirePermission("schedules", "manageOwnAvailability");

  if (!Array.isArray(payload.days) || payload.days.length === 0) {
    return { ok: false, error: "Informe ao menos um dia da semana." };
  }
  if (payload.days.length > 7) {
    return { ok: false, error: "Há mais dias da semana do que o permitido." };
  }

  const generalNotes = payload.generalNotes?.trim() || null;
  if (generalNotes && generalNotes.length > 1000) {
    return {
      ok: false,
      error: "As observações gerais devem ter no máximo 1000 caracteres.",
    };
  }

  const seenDays = new Set<number>();
  const normalizedDays: {
    dayOfWeek: number;
    periods: AvailabilityPeriod[];
    notes: string | null;
  }[] = [];

  for (const item of payload.days) {
    if (
      !Number.isInteger(item.dayOfWeek) ||
      item.dayOfWeek < 0 ||
      item.dayOfWeek > 6
    ) {
      return { ok: false, error: "Dia da semana inválido." };
    }
    if (seenDays.has(item.dayOfWeek)) {
      return { ok: false, error: "Dia da semana duplicado." };
    }
    seenDays.add(item.dayOfWeek);

    const periods = normalizePeriods(item.periods);
    if (!periods) {
      return { ok: false, error: "Período de disponibilidade inválido." };
    }

    const notes = item.notes?.trim() || null;
    if (notes && notes.length > 500) {
      return {
        ok: false,
        error: "As observações de um dia devem ter no máximo 500 caracteres.",
      };
    }

    normalizedDays.push({ dayOfWeek: item.dayOfWeek, periods, notes });
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

  try {
    const now = new Date();

    for (const day of normalizedDays) {
      const noteToSave = day.notes || generalNotes;

      const existing = await db.query.personAvailability.findFirst({
        where: and(
          eq(schema.personAvailability.organizationId, context.organization.id),
          eq(schema.personAvailability.personId, person.id),
          eq(schema.personAvailability.dayOfWeek, day.dayOfWeek),
        ),
      });

      if (existing) {
        await db
          .update(schema.personAvailability)
          .set({
            periods: day.periods,
            notes: noteToSave,
            updatedAt: now,
          })
          .where(eq(schema.personAvailability.id, existing.id));
      } else {
        await db.insert(schema.personAvailability).values({
          id: randomUUID(),
          organizationId: context.organization.id,
          personId: person.id,
          dayOfWeek: day.dayOfWeek,
          periods: day.periods,
          notes: noteToSave,
        });
      }
    }

    revalidatePath("/dashboard/availability");
    revalidatePath("/dashboard/schedules");
    revalidatePath("/dashboard");
    return { ok: true, updatedAt: now };
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

  const dayMap = new Map(rows.map((row) => [row.dayOfWeek, row]));

  return DAYS_OF_WEEK.map((day) => {
    const existing = dayMap.get(day.index);
    return {
      dayOfWeek: day.index,
      periods: (existing?.periods as AvailabilityPeriod[]) || [],
      notes: existing?.notes || null,
      informed: Boolean(existing),
      updatedAt: existing?.updatedAt ?? null,
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

  return rows.map(toUnavailabilityItem);
}

export async function saveUnavailabilityAction(payload: {
  date: string;
  reason?: string | null;
  allDay?: boolean;
  periods?: AvailabilityPeriod[];
}): Promise<SaveUnavailabilityResult> {
  const context = await requireOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }
  await requirePermission("schedules", "manageOwnAvailability");

  const dateTrimmed = payload.date?.trim();
  if (!dateTrimmed || !/^\d{4}-\d{2}-\d{2}$/.test(dateTrimmed)) {
    return { ok: false, error: "Data inválida. Use o formato AAAA-MM-DD." };
  }

  const parsedDate = parseISO(dateTrimmed);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    formatDateToYYYYMMDD(parsedDate) !== dateTrimmed
  ) {
    return { ok: false, error: "Data inválida." };
  }

  const reason = payload.reason?.trim() || null;
  if (reason && reason.length > 200) {
    return {
      ok: false,
      error: "O motivo deve ter no máximo 200 caracteres.",
    };
  }

  const isAllDay = payload.allDay ?? true;
  const periods = isAllDay
    ? []
    : normalizePeriods(payload.periods ?? []);

  if (!periods) {
    return { ok: false, error: "Período de indisponibilidade inválido." };
  }
  if (!isAllDay && periods.length === 0) {
    return {
      ok: false,
      error: "Selecione ao menos um período ou marque o dia todo.",
    };
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

  try {
    const existing = await db.query.personUnavailability.findFirst({
      where: and(
        eq(schema.personUnavailability.organizationId, context.organization.id),
        eq(schema.personUnavailability.personId, person.id),
        eq(schema.personUnavailability.date, dateTrimmed),
      ),
    });

    const now = new Date();
    let row: typeof schema.personUnavailability.$inferSelect | undefined;

    if (existing) {
      [row] = await db
        .update(schema.personUnavailability)
        .set({
          reason,
          allDay: isAllDay,
          periods,
          updatedAt: now,
        })
        .where(eq(schema.personUnavailability.id, existing.id))
        .returning();
    } else {
      [row] = await db
        .insert(schema.personUnavailability)
        .values({
          id: randomUUID(),
          organizationId: context.organization.id,
          personId: person.id,
          date: dateTrimmed,
          reason,
          allDay: isAllDay,
          periods,
        })
        .returning();
    }

    if (!row) {
      return {
        ok: false,
        error: "Não foi possível registrar o bloqueio de data.",
      };
    }

    revalidatePath("/dashboard/availability");
    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/schedules");
    revalidatePath("/dashboard/calendar");

    return {
      ok: true,
      item: toUnavailabilityItem({
        ...row,
        periods: (row.periods as AvailabilityPeriod[]) || [],
      }),
      updated: Boolean(existing),
    };
  } catch (error) {
    console.error("Erro ao salvar indisponibilidade:", error);
    return { ok: false, error: "Não foi possível registrar o bloqueio de data." };
  }
}

export async function deleteUnavailabilityAction(
  id: string,
): Promise<DeleteUnavailabilityResult> {
  const context = await requireOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }
  await requirePermission("schedules", "manageOwnAvailability");

  if (!id) {
    return { ok: false, error: "Indisponibilidade inválida." };
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

  try {
    const deleted = await db
      .delete(schema.personUnavailability)
      .where(
        and(
          eq(schema.personUnavailability.id, id),
          eq(schema.personUnavailability.organizationId, context.organization.id),
          eq(schema.personUnavailability.personId, person.id),
        ),
      )
      .returning({ id: schema.personUnavailability.id });

    revalidatePath("/dashboard/availability");
    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/schedules");
    revalidatePath("/dashboard/calendar");

    return { ok: true, deleted: deleted.length > 0 };
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
  isInformed: boolean;
  blockedReason?: string | null;
  dayOfWeek: number;
  period: AvailabilityPeriod;
  notes?: string | null;
}> {
  const context = await requireOrganizationContext();
  await requirePermission("schedules", "read");

  const dateStr = formatDateToYYYYMMDD(eventStartsAt);
  const dayOfWeek = eventStartsAt.getDay();
  const period = getPeriodFromDate(eventStartsAt);

  const person = await db.query.person.findFirst({
    where: and(
      eq(schema.person.id, personId),
      eq(schema.person.organizationId, context.organization.id),
    ),
  });

  if (!person) {
    return {
      isAvailable: false,
      isBlocked: false,
      isInformed: false,
      dayOfWeek,
      period,
    };
  }

  const [blockedDate, weekly] = await Promise.all([
    db.query.personUnavailability.findFirst({
      where: and(
        eq(schema.personUnavailability.organizationId, context.organization.id),
        eq(schema.personUnavailability.personId, personId),
        eq(schema.personUnavailability.date, dateStr),
      ),
    }),
    db.query.personAvailability.findFirst({
      where: and(
        eq(schema.personAvailability.organizationId, context.organization.id),
        eq(schema.personAvailability.personId, personId),
        eq(schema.personAvailability.dayOfWeek, dayOfWeek),
      ),
    }),
  ]);

  const isInformed = Boolean(weekly);

  if (blockedDate) {
    const periods = (blockedDate.periods as AvailabilityPeriod[]) || [];
    const isBlocked = blockedDate.allDay || periods.includes(period);
    if (isBlocked) {
      return {
        isAvailable: false,
        isBlocked: true,
        isInformed,
        blockedReason:
          blockedDate.reason || "Indisponibilidade pontual registrada para esta data",
        dayOfWeek,
        period,
      };
    }
  }

  if (!weekly) {
    return {
      isAvailable: false,
      isBlocked: false,
      isInformed: false,
      dayOfWeek,
      period,
    };
  }

  const weeklyPeriods = (weekly.periods as AvailabilityPeriod[]) || [];
  const isAvailable = weeklyPeriods.includes(period);

  return {
    isAvailable,
    isBlocked: false,
    isInformed,
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
