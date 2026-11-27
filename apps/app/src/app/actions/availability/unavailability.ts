"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  formatDateToYYYYMMDD,
  type DeleteUnavailabilityResult,
  type PersonUnavailabilityItem,
  type SaveUnavailabilityResult,
} from "@/lib/availability";
import { requireOrganizationContext } from "@/lib/organizations";
import { ensurePersonForUser } from "@/lib/people";
import { requirePermission } from "@/lib/permissions/service";
import type { AvailabilityPeriod } from "@/db/schema";
import { normalizePeriods, toUnavailabilityItem } from "./shared";

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

    revalidatePath("/availability");
    revalidatePath("/events");
    revalidatePath("/schedules");
    revalidatePath("/calendar");

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

    revalidatePath("/availability");
    revalidatePath("/events");
    revalidatePath("/schedules");
    revalidatePath("/calendar");

    return { ok: true, deleted: deleted.length > 0 };
  } catch (error) {
    console.error("Erro ao remover indisponibilidade:", error);
    return { ok: false, error: "Não foi possível remover a indisponibilidade." };
  }
}
