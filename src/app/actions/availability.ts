"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  DAYS_OF_WEEK,
  getPeriodFromDate,
  type DayAvailability,
  type MyAvailabilityResult,
} from "@/lib/availability";
import { requireOrganizationContext } from "@/lib/organizations";
import { ensurePersonForUser } from "@/lib/people";
import type { AvailabilityPeriod } from "@/db/schema/people";

export async function getMyAvailabilityAction(): Promise<MyAvailabilityResult | null> {
  const context = await requireOrganizationContext();
  if (!context) return null;

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

export async function checkPersonAvailabilityForEventAction(
  personId: string,
  eventStartsAt: Date,
): Promise<{
  isAvailable: boolean;
  dayOfWeek: number;
  period: AvailabilityPeriod;
  notes?: string | null;
}> {
  const dayOfWeek = eventStartsAt.getDay();
  const period = getPeriodFromDate(eventStartsAt);

  const row = await db.query.personAvailability.findFirst({
    where: and(
      eq(schema.personAvailability.personId, personId),
      eq(schema.personAvailability.dayOfWeek, dayOfWeek),
    ),
  });

  if (!row) {
    return { isAvailable: false, dayOfWeek, period };
  }

  const periods = (row.periods as AvailabilityPeriod[]) || [];
  const isAvailable = periods.includes(period);

  return {
    isAvailable,
    dayOfWeek,
    period,
    notes: row.notes,
  };
}
