"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  DAYS_OF_WEEK,
  type DayAvailability,
  type MyAvailabilityResult,
  type SaveMyAvailabilityResult,
} from "@/lib/availability";
import { requireOrganizationContext } from "@/lib/organizations";
import { ensurePersonForUser } from "@/lib/people";
import { requirePermission } from "@/lib/permissions/service";
import type { AvailabilityPeriod } from "@/db/schema";
import { normalizePeriods } from "./shared";

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

    const rows = normalizedDays.map((day) => ({
      id: randomUUID(),
      organizationId: context.organization.id,
      personId: person.id,
      dayOfWeek: day.dayOfWeek,
      periods: day.periods,
      notes: day.notes || generalNotes,
      createdAt: now,
      updatedAt: now,
    }));

    // Um único upsert em lote amparado pelo índice único existente
    // `person_availability_person_day_uidx` (org + pessoa + dia), sem o
    // findFirst/update/insert sequencial por dia.
    await db
      .insert(schema.personAvailability)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          schema.personAvailability.organizationId,
          schema.personAvailability.personId,
          schema.personAvailability.dayOfWeek,
        ],
        set: {
          periods: sql`excluded.periods`,
          notes: sql`excluded.notes`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    revalidatePath("/availability");
    revalidatePath("/departments");
    revalidatePath("/schedules");
    revalidatePath("/");
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
