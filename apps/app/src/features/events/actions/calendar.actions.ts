"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import type { CalendarItem, CalendarPreferences } from "@/lib/calendar";
import { listEvents } from "@/lib/events";
import { requireOrganizationContext } from "@/lib/organizations";
import { ensurePersonForUser, listPeople } from "@/lib/people";
import { personDisplayBirthday, personDisplayName } from "@/lib/person-format";
import { requirePermission } from "@/lib/permissions/service";

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

  await requirePermission("agenda", "read");

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

  const [events, unavailabilities, people] = await Promise.all([
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
    listPeople(organization.id),
  ]);

  const items: CalendarItem[] = [];

  // 1. Process church events & personal assignments
  for (const event of events) {
    const assignments = event.schedule?.assignments ?? [];
    const myAssignments = person
      ? assignments.filter((a) => a.personId === person.id)
      : [];

    const eventDeptIds = event.departments.map((d) => d.departmentId);

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
        departmentIds: eventDeptIds,
        isMyAssignment: myAssignments.length > 0,
      },
    });

    // If user is assigned, create dedicated assignment item grouped by event
    if (myAssignments.length > 0) {
      const distinctFunctions = Array.from(
        new Set(myAssignments.map((a) => a.function.name).filter(Boolean)),
      );
      const distinctDepts = Array.from(
        new Set(
          myAssignments
            .map(
              (a) =>
                event.departments.find((d) => d.departmentId === a.departmentId)
                  ?.department?.name,
            )
            .filter((name): name is string => Boolean(name)),
        ),
      );

      const functionsLabel =
        distinctFunctions.length === 1
          ? distinctFunctions[0]
          : distinctFunctions.join(", ");

      const deptLabel = distinctDepts.join(", ");
      const assignmentInfo = deptLabel
        ? `Escalado: ${functionsLabel} · ${deptLabel}`
        : `Escalado: ${functionsLabel}`;

      items.push({
        id: `assignment-event-${event.id}`,
        type: "assignment",
        title: event.title,
        subtitle: assignmentInfo,
        description: `Funções: ${functionsLabel} no evento ${event.title}`,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        allDay: false,
        color: "emerald",
        location: event.location,
        href: `/dashboard/events/${event.id}`,
        metadata: {
          eventId: event.id,
          departmentId: myAssignments[0]?.departmentId,
          departmentIds: eventDeptIds,
          departmentName: deptLabel,
          functionName: functionsLabel,
          isMyAssignment: true,
        },
      });
    }
  }

  // 2. Process user unavailabilities
  for (const unavail of unavailabilities) {
    const dateStr = unavail.date; // "YYYY-MM-DD"
    // Use noon UTC to avoid date shifting across global timezones
    const startsAt = `${dateStr}T12:00:00.000Z`;
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

  // 3. Process birthdays based on departments
  const currentYear = new Date().getFullYear();
  for (const p of people) {
    const bdayVal = personDisplayBirthday(p);
    if (!bdayVal) continue;

    const parts = bdayVal.split("-");
    if (parts.length < 3) continue;
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!month || !day) continue;

    const deptNames =
      p.memberships
        ?.map((m) => m.department?.name)
        .filter((name): name is string => Boolean(name)) ?? [];
    const deptIds = p.memberships?.map((m) => m.departmentId) ?? [];
    const deptSubtitle =
      deptNames.length > 0 ? deptNames.join(", ") : "Sem departamento";

    const pName = personDisplayName(p);

    for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      items.push({
        id: `birthday-${p.id}-${year}`,
        type: "birthday",
        title: `Aniversário: ${pName}`,
        subtitle: deptSubtitle,
        description: `Aniversário de ${pName} (${deptSubtitle})`,
        startsAt: `${dateStr}T12:00:00.000Z`,
        endsAt: `${dateStr}T23:59:59.000Z`,
        allDay: true,
        color: "rose",
        href: `/dashboard/members/${p.id}`,
        metadata: {
          personId: p.id,
          personName: pName,
          departmentName: deptSubtitle,
          departmentNames: deptNames,
          departmentIds: deptIds,
        },
      });
    }
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
