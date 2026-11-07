"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import type { CalendarItem, CalendarPreferences } from "@/lib/calendar";
import { listEvents } from "@/lib/events";
import { requireOrganizationContext } from "@/lib/organizations";
import { ensurePersonForUser } from "@/lib/people";

export async function getCalendarDataAction(): Promise<{
  items: CalendarItem[];
  preferences: CalendarPreferences;
}> {
  const context = await requireOrganizationContext();
  if (!context) {
    return {
      items: [],
      preferences: { weekStartsOn: 0, timezone: "America/Sao_Paulo" },
    };
  }

  const { organization, session } = context;

  const [userRow, person] = await Promise.all([
    db.query.user.findFirst({
      where: eq(schema.user.id, session.user.id),
      columns: {
        weekStartsOn: true,
        timezone: true,
      },
    }),
    ensurePersonForUser(organization.id, {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      birthday: session.user.birthday ?? null,
    }),
  ]);

  const preferences: CalendarPreferences = {
    weekStartsOn: userRow?.weekStartsOn === 1 ? 1 : 0,
    timezone: userRow?.timezone || "America/Sao_Paulo",
  };

  const [events, unavailabilities] = await Promise.all([
    listEvents(organization.id),
    person
      ? db.query.personUnavailability.findMany({
          where: and(
            eq(schema.personUnavailability.organizationId, organization.id),
            eq(schema.personUnavailability.personId, person.id),
          ),
          orderBy: (table, { asc }) => [asc(table.date)],
        })
      : Promise.resolve([]),
  ]);

  const items: CalendarItem[] = [];

  // 1. Process church events & personal assignments
  for (const event of events) {
    const assignments = event.schedule?.assignments ?? [];
    const myAssignments = person
      ? assignments.filter((a) => a.personId === person.id)
      : [];

    // Push church event
    items.push({
      id: `event-${event.id}`,
      type: "event",
      title: event.title,
      description: event.description,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      allDay: false,
      color: event.kind === "service" ? "primary" : "purple",
      location: event.location,
      href: `/dashboard/events/${event.id}`,
      metadata: {
        eventId: event.id,
        eventKind: event.kind,
        isMyAssignment: myAssignments.length > 0,
      },
    });

    // If user is assigned, create dedicated assignment items
    for (const assignment of myAssignments) {
      const deptName = event.departments.find(
        (d) => d.departmentId === assignment.departmentId,
      )?.department?.name;

      items.push({
        id: `assignment-${assignment.id}`,
        type: "assignment",
        title: `Escalado: ${assignment.function.name}`,
        subtitle: deptName ? `${deptName} · ${event.title}` : event.title,
        description: `Função: ${assignment.function.name} no evento ${event.title}`,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        allDay: false,
        color: "emerald",
        location: event.location,
        href: `/dashboard/events/${event.id}`,
        metadata: {
          eventId: event.id,
          departmentName: deptName,
          functionName: assignment.function.name,
          isMyAssignment: true,
        },
      });
    }
  }

  // 2. Process user unavailabilities
  for (const unavail of unavailabilities) {
    const dateStr = unavail.date; // "YYYY-MM-DD"
    // Use ISO strings at start and end of day
    const startsAt = `${dateStr}T00:00:00.000Z`;
    const endsAt = `${dateStr}T23:59:59.000Z`;

    items.push({
      id: `unavail-${unavail.id}`,
      type: "unavailability",
      title: unavail.reason ? `Indisponível: ${unavail.reason}` : "Indisponível",
      subtitle: unavail.allDay ? "Dia todo" : "Períodos específicos",
      description: unavail.reason,
      startsAt,
      endsAt,
      allDay: unavail.allDay,
      color: "amber",
      href: "/dashboard/availability",
      metadata: {
        reason: unavail.reason,
        periods: (unavail.periods as schema.AvailabilityPeriod[]) || [],
      },
    });
  }

  return {
    items,
    preferences,
  };
}

export async function saveCalendarPreferencesAction(payload: {
  weekStartsOn: number;
  timezone: string;
}): Promise<{ ok: boolean; error?: string }> {
  const context = await requireOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const weekStartsOn = payload.weekStartsOn === 1 ? 1 : 0;
  const timezone = payload.timezone?.trim() || "America/Sao_Paulo";

  try {
    await db
      .update(schema.user)
      .set({
        weekStartsOn,
        timezone,
      })
      .where(eq(schema.user.id, context.session.user.id));

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    console.error("Erro ao salvar preferências de calendário:", error);
    return {
      ok: false,
      error: "Não foi possível salvar as preferências do calendário.",
    };
  }
}
