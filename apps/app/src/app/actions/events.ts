"use server";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, lt, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import { EVENT_KINDS, RECURRENCE_OPTIONS } from "@/lib/event-options";
import {
  applyTimeOfDay,
  endOfDayInZone,
  formatEventFullDate,
  formatEventTime,
  generateOccurrences,
  getEvent,
  getNthWeekdayInfo,
  zonedDateTimeToUtc,
} from "@/lib/events";
import { createNotifications } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notification-service";
import { getOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";

export type EventFormState =
  | {
      error?: string;
      fieldErrors?: {
        title?: string[];
        description?: string[];
        kind?: string[];
        date?: string[];
        startTime?: string[];
        durationMinutes?: string[];
        location?: string[];
        recurrence?: string[];
        recurrenceEndsAt?: string[];
        recurrenceInterval?: string[];
        departments?: string[];
      };
      success?: boolean;
    }
  | undefined;

export type ScheduleFormState =
  | {
      error?: string;
      fieldErrors?: {
        departmentId?: string[];
        functionId?: string[];
        personId?: string[];
      };
      success?: boolean;
      assignment?: {
        id: string;
        departmentId: string;
        functionId: string;
        personId: string;
        person: {
          id: string;
          name: string;
          email?: string | null;
          image?: string | null;
        };
        function: { name: string };
      };
    }
  | undefined;

export type EventActionResult = {
  ok: boolean;
  error?: string;
};

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(max, message).optional(),
  );

function isValidDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data no formato AAAA-MM-DD.")
  .refine(isValidDateString, "Informe uma data válida.");

const timeField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.");

const integerField = (message: string, min: number, max: number) =>
  z.preprocess(
    (value) => {
      const number = Number(value);
      return Number.isFinite(number) && value !== "" ? number : undefined;
    },
    z.number({ error: message }).int(message).min(min, message).max(max, message),
  );

const baseEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Informe o nome do culto ou evento.")
    .max(100, "O nome pode ter no máximo 100 caracteres."),
  description: optionalText(
    1000,
    "A descrição pode ter no máximo 1000 caracteres.",
  ),
  kind: z.enum(EVENT_KINDS, { error: "Escolha o tipo do evento." }),
  date: dateField,
  startTime: timeField,
  durationMinutes: integerField(
    "Informe a duração em minutos.",
    15,
    1440,
  ),
  location: optionalText(120, "O local pode ter no máximo 120 caracteres."),
  departments: z.array(z.string()).default([]),
});

const createEventSchema = baseEventSchema.extend({
  recurrence: z.enum(RECURRENCE_OPTIONS, {
    error: "Escolha a recorrência.",
  }),
  recurrenceEndsAt: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    dateField.optional(),
  ),
  recurrenceInterval: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      const number = Number(value);
      return Number.isFinite(number) ? number : undefined;
    },
    z.number().int().min(-1).max(12).optional(),
  ),
});

const updateEventSchema = baseEventSchema.extend({
  eventId: z.string().trim().min(1, "Evento inválido."),
  scope: z.enum(["single", "series"], {
    error: "Escolha o alcance da alteração.",
  }),
});

const scheduleAssignmentSchema = z.object({
  eventId: z.string().trim().min(1, "Evento inválido."),
  departmentId: z.string().trim().min(1, "Departamento inválido."),
  functionId: z.string().trim().min(1, "Escolha uma função."),
  personId: z.string().trim().min(1, "Escolha uma pessoa."),
});

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;

  if (typeof code === "string") {
    return code;
  }

  return errorCode((error as { cause?: unknown }).cause);
}

function isUniqueViolation(error: unknown) {
  return errorCode(error) === "23505";
}

function departmentsFromForm(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("departments")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

async function validateDepartments(
  organizationId: string,
  departmentIds: string[],
) {
  if (departmentIds.length === 0) {
    return [];
  }

  const rows = await db.query.department.findMany({
    where: and(
      eq(schema.department.organizationId, organizationId),
      inArray(schema.department.id, departmentIds),
    ),
    columns: { id: true },
  });

  return rows.map((row) => row.id);
}

async function revalidateEvents(eventId?: string, organizationId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/schedules");
  revalidatePath("/dashboard/calendar");

  if (eventId) {
    revalidatePath(`/dashboard/events/${eventId}`);
  }

  if (organizationId) {
    const tags = [`events:${organizationId}`];
    if (eventId) {
      tags.push(`event:${eventId}`);
    }
    await cacheInvalidateTags(...tags);
  }
}

async function replaceEventDepartments(
  eventIds: string[],
  departmentIds: string[],
) {
  if (eventIds.length === 0) {
    return;
  }

  await db
    .delete(schema.eventDepartment)
    .where(inArray(schema.eventDepartment.eventId, eventIds));

  if (departmentIds.length === 0) {
    return;
  }

  await db.insert(schema.eventDepartment).values(
    eventIds.flatMap((eventId) =>
      departmentIds.map((departmentId) => ({
        id: randomUUID(),
        eventId,
        departmentId,
      })),
    ),
  );
}

/**
 * When a department is removed from an event, its assignments stop being
 * visible in the scale. Delete them explicitly so re-adding the department
 * does not silently resurrect stale assignments.
 */
async function removeAssignmentsForRemovedDepartments(
  eventIds: string[],
  keptDepartmentIds: string[],
) {
  if (eventIds.length === 0) {
    return;
  }

  const schedules = await db.query.schedule.findMany({
    where: inArray(schema.schedule.eventId, eventIds),
    columns: { id: true },
  });

  if (schedules.length === 0) {
    return;
  }

  await db
    .delete(schema.scheduleAssignment)
    .where(
      and(
        inArray(
          schema.scheduleAssignment.scheduleId,
          schedules.map((schedule) => schedule.id),
        ),
        keptDepartmentIds.length > 0
          ? notInArray(
              schema.scheduleAssignment.departmentId,
              keptDepartmentIds,
            )
          : undefined,
      ),
    );
}

export async function createEventAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    kind: formData.get("kind"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    durationMinutes: formData.get("durationMinutes"),
    location: formData.get("location"),
    recurrence: formData.get("recurrence"),
    recurrenceEndsAt: formData.get("recurrenceEndsAt"),
    recurrenceInterval: formData.get("recurrenceInterval"),
    departments: departmentsFromForm(formData),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const context = await getOrganizationContext();

  if (!context) {
    return {
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    };
  }

  const organizationId = context.organization.id;

  const validDepartmentIds = await validateDepartments(
    organizationId,
    parsed.data.departments,
  );

  if (validDepartmentIds.length !== parsed.data.departments.length) {
    return {
      fieldErrors: {
        departments: ["Um dos departamentos selecionados não foi encontrado."],
      },
    };
  }

  if (validDepartmentIds.length === 0) {
    const allowed = await can("agenda", "createEvent");
    if (!allowed) {
      return {
        error: "Você não tem permissão para criar eventos gerais da igreja.",
      };
    }
  } else {
    for (const departmentId of validDepartmentIds) {
      const allowed = await can("agenda", "createEvent", { departmentId });
      if (!allowed) {
        return {
          error: "Você não tem permissão para criar eventos neste departamento.",
        };
      }
    }
  }

  const { recurrence } = parsed.data;
  let recurrenceEndsAt: Date | null = null;

  if (recurrence !== "none") {
    if (!parsed.data.recurrenceEndsAt) {
      return {
        fieldErrors: {
          recurrenceEndsAt: ["Informe até quando o evento se repete."],
        },
      };
    }

    if (recurrence === "custom" && !parsed.data.recurrenceInterval) {
      return {
        fieldErrors: {
          recurrenceInterval: ["Informe o intervalo em semanas."],
        },
      };
    }

    recurrenceEndsAt = endOfDayInZone(parsed.data.recurrenceEndsAt);
  }

  const startsAt = zonedDateTimeToUtc(
    parsed.data.date,
    parsed.data.startTime,
  );

  if (recurrenceEndsAt && recurrenceEndsAt.getTime() < startsAt.getTime()) {
    return {
      fieldErrors: {
        recurrenceEndsAt: ["A data final precisa ser depois do início."],
      },
    };
  }

  const durationMs = parsed.data.durationMinutes * 60_000;
  const endsAt = new Date(startsAt.getTime() + durationMs);

  const nthFromDate = getNthWeekdayInfo(startsAt).nth;
  const recurrenceInterval =
    recurrence === "custom"
      ? (parsed.data.recurrenceInterval ?? null)
      : recurrence === "monthly_nth_weekday"
        ? (parsed.data.recurrenceInterval ?? nthFromDate)
        : null;

  const occurrences = generateOccurrences({
    startsAt,
    endsAt,
    recurrence,
    recurrenceInterval,
    recurrenceEndsAt,
  });
  const seriesId = recurrence === "none" ? null : randomUUID();
  const eventIds = occurrences.map(() => randomUUID());

  try {
    await db.insert(schema.event).values(
      occurrences.map((occurrence, index) => ({
        id: eventIds[index],
        organizationId,
        seriesId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        kind: parsed.data.kind,
        location: parsed.data.location ?? null,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        recurrence: recurrence === "none" ? null : recurrence,
        recurrenceInterval,
        recurrenceEndsAt,
      })),
    );

    if (validDepartmentIds.length > 0) {
      await db.insert(schema.eventDepartment).values(
        eventIds.flatMap((eventId) =>
          validDepartmentIds.map((departmentId) => ({
            id: randomUUID(),
            eventId,
            departmentId,
          })),
        ),
      );
    }
  } catch (error) {
    console.error("Erro ao criar evento", error);
    await db
      .delete(schema.event)
      .where(inArray(schema.event.id, eventIds))
      .catch(() => undefined);
    return { error: "Não foi possível criar o evento." };
  }

  await revalidateEvents(eventIds[0], organizationId);
  redirect(`/dashboard/events/${eventIds[0]}`);
}

export async function updateEventAction(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const parsed = updateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    scope: formData.get("scope") ?? "single",
    title: formData.get("title"),
    description: formData.get("description"),
    kind: formData.get("kind"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    durationMinutes: formData.get("durationMinutes"),
    location: formData.get("location"),
    departments: departmentsFromForm(formData),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const context = await getOrganizationContext();

  if (!context) {
    return { error: "Sua sessão expirou ou você não tem uma igreja ativa." };
  }

  const organizationId = context.organization.id;
  const event = await getEvent(organizationId, parsed.data.eventId);

  if (!event) {
    return { error: "Evento não encontrado." };
  }

  const allowed = await can("agenda", "updateEvent", { eventId: event.id });
  if (!allowed) {
    return { error: "Você não tem permissão para editar este evento." };
  }

  const validDepartmentIds = await validateDepartments(
    organizationId,
    parsed.data.departments,
  );

  if (validDepartmentIds.length !== parsed.data.departments.length) {
    return {
      fieldErrors: {
        departments: ["Um dos departamentos selecionados não foi encontrado."],
      },
    };
  }

  for (const departmentId of validDepartmentIds) {
    const allowedDept = await can("agenda", "updateEvent", { departmentId });
    if (!allowedDept) {
      return {
        error: "Você não tem permissão para vincular este departamento ao evento.",
      };
    }
  }

  const startsAt = zonedDateTimeToUtc(parsed.data.date, parsed.data.startTime);
  const durationMs = parsed.data.durationMinutes * 60_000;
  const endsAt = new Date(startsAt.getTime() + durationMs);
  const baseUpdate = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    kind: parsed.data.kind,
    location: parsed.data.location ?? null,
  };

  try {
    if (parsed.data.scope === "series" && event.seriesId) {
      const series = await db.query.event.findMany({
        where: and(
          eq(schema.event.organizationId, organizationId),
          eq(schema.event.seriesId, event.seriesId),
        ),
        orderBy: [asc(schema.event.startsAt)],
      });
      const seriesIds = series.map((seriesEvent) => seriesEvent.id);

      await Promise.all(
        series.map((seriesEvent) => {
          const times =
            seriesEvent.id === event.id
              ? { startsAt, endsAt }
              : applyTimeOfDay(
                  seriesEvent.startsAt,
                  parsed.data.startTime,
                  durationMs,
                );

          return db
            .update(schema.event)
            .set({
              ...baseUpdate,
              ...times,
              isOverride: seriesEvent.id === event.id,
            })
            .where(eq(schema.event.id, seriesEvent.id));
        }),
      );

      await replaceEventDepartments(seriesIds, validDepartmentIds);
      await removeAssignmentsForRemovedDepartments(
        seriesIds,
        validDepartmentIds,
      );
    } else {
      await db
        .update(schema.event)
        .set({
          ...baseUpdate,
          startsAt,
          endsAt,
          isOverride: Boolean(event.seriesId),
        })
        .where(eq(schema.event.id, event.id));

      await replaceEventDepartments([event.id], validDepartmentIds);
      await removeAssignmentsForRemovedDepartments(
        [event.id],
        validDepartmentIds,
      );
    }
  } catch (error) {
    console.error("Erro ao atualizar evento", error);
    return { error: "Não foi possível salvar o evento." };
  }

  await revalidateEvents(event.id, organizationId);
  return { success: true };
}

export async function deleteEventAction(
  input: string | FormData,
  scopeInput: "single" | "series" = "single",
): Promise<EventActionResult> {
  const eventId = typeof input === "string" ? input : input.get("eventId");
  const scope =
    typeof input === "string"
      ? scopeInput
      : ((input.get("scope") as "single" | "series") || scopeInput);

  if (!eventId || typeof eventId !== "string") {
    return { ok: false, error: "Evento inválido." };
  }

  const context = await getOrganizationContext();

  if (!context) {
    return {
      ok: false,
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    };
  }

  const event = await getEvent(context.organization.id, eventId);

  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

  const allowed = await can("agenda", "deleteEvent", { eventId: event.id });
  if (!allowed) {
    return {
      ok: false,
      error: "Você não tem permissão para excluir este evento.",
    };
  }

  try {
    if (scope === "series" && event.seriesId) {
      await db
        .delete(schema.event)
        .where(
          and(
            eq(schema.event.organizationId, context.organization.id),
            eq(schema.event.seriesId, event.seriesId),
          ),
        );
    } else {
      await db.delete(schema.event).where(eq(schema.event.id, event.id));
    }
  } catch (error) {
    console.error("Erro ao excluir evento", error);
    return { ok: false, error: "Não foi possível excluir o evento." };
  }

  await revalidateEvents(event.id, context.organization.id);
  return { ok: true };
}

async function getScheduleAccess(eventId: string, departmentId: string) {
  const context = await getOrganizationContext();

  if (!context) {
    return {
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    } as const;
  }

  const event = await getEvent(context.organization.id, eventId);

  if (!event) {
    return { error: "Evento não encontrado." } as const;
  }

  const actsInEvent = event.departments.some(
    (item) => item.departmentId === departmentId,
  );

  if (!actsInEvent) {
    return {
      error: "Esse departamento não atua neste evento.",
    } as const;
  }

  const allowed = await can("schedules", "assign", {
    eventId: event.id,
    departmentId,
  });

  if (!allowed) {
    return {
      error:
        "Você não tem permissão para gerenciar a escala deste departamento.",
    } as const;
  }

  const dept = await db.query.department.findFirst({
    where: and(
      eq(schema.department.id, departmentId),
      eq(schema.department.organizationId, context.organization.id),
    ),
  });

  return { context, event, department: dept } as const;
}

async function getOrCreateSchedule(eventId: string) {
  const existing = await db.query.schedule.findFirst({
    where: eq(schema.schedule.eventId, eventId),
  });

  if (existing) {
    return existing;
  }

  const id = randomUUID();

  await db
    .insert(schema.schedule)
    .values({ id, eventId })
    .onConflictDoNothing();

  return db.query.schedule.findFirst({
    where: eq(schema.schedule.eventId, eventId),
  });
}

export async function saveScheduleAssignmentAction(
  _state: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  const parsed = scheduleAssignmentSchema.safeParse({
    eventId: formData.get("eventId"),
    departmentId: formData.get("departmentId"),
    functionId: formData.get("functionId"),
    personId: formData.get("personId"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await getScheduleAccess(
    parsed.data.eventId,
    parsed.data.departmentId,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  const targetFunction = await db.query.departmentFunction.findFirst({
    where: and(
      eq(schema.departmentFunction.id, parsed.data.functionId),
      eq(schema.departmentFunction.departmentId, parsed.data.departmentId),
    ),
    columns: { id: true, name: true },
  });

  if (!targetFunction) {
    return { error: "Função não encontrada neste departamento." };
  }

  const belongsToDepartment = await db.query.departmentMember.findFirst({
    where: and(
      eq(schema.departmentMember.departmentId, parsed.data.departmentId),
      eq(schema.departmentMember.personId, parsed.data.personId),
    ),
    columns: { id: true },
  });

  if (!belongsToDepartment) {
    return { error: "Essa pessoa não faz parte deste departamento." };
  }

  const scheduleRow = await getOrCreateSchedule(parsed.data.eventId);

  if (!scheduleRow) {
    return { error: "Não foi possível abrir a escala deste evento." };
  }

  const newAssignmentId = randomUUID();

  try {
    await db.insert(schema.scheduleAssignment).values({
      id: newAssignmentId,
      scheduleId: scheduleRow.id,
      departmentId: parsed.data.departmentId,
      functionId: parsed.data.functionId,
      personId: parsed.data.personId,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Essa pessoa já está escalada nesta função." };
    }

    console.error("Erro ao salvar escala", error);
    return { error: "Não foi possível salvar a escala." };
  }

  const assignedPerson = await db.query.person.findFirst({
    where: and(
      eq(schema.person.id, parsed.data.personId),
      eq(schema.person.organizationId, result.context.organization.id),
    ),
    with: { user: true },
  });

  if (assignedPerson) {
    const departmentName =
      result.department?.name ||
      result.event.departments.find(
        (d) => d.departmentId === parsed.data.departmentId,
      )?.department?.name ||
      "Departamento";

    void dispatchNotification({
      organizationId: result.context.organization.id,
      type: "assignment",
      title: `Você foi escalado em ${result.event.title}`,
      body: `${departmentName} · ${targetFunction.name} · ${formatEventFullDate(result.event.startsAt)} às ${formatEventTime(result.event.startsAt)}`,
      href: `/dashboard/events/${result.event.id}`,
      actorId: result.context.session.user.id,
      userId: assignedPerson.userId ?? null,
      personId: parsed.data.personId,
      phone: assignedPerson.phone ?? assignedPerson.user?.phone ?? null,
      email: assignedPerson.email ?? assignedPerson.user?.email ?? null,
      name: assignedPerson.name,
      metadata: {
        churchName: result.context.organization.name,
        eventTitle: result.event.title,
        functionName: `${departmentName} - ${targetFunction.name}`,
        eventDate: formatEventFullDate(result.event.startsAt),
        eventTime: formatEventTime(result.event.startsAt),
        link: `/dashboard/events/${result.event.id}`,
      },
    }).catch((error) => {
      console.error("Erro ao notificar escala", error);
    });
  }

  await revalidateEvents(parsed.data.eventId, result.context.organization.id);
  return {
    success: true,
    assignment: {
      id: newAssignmentId,
      departmentId: parsed.data.departmentId,
      functionId: parsed.data.functionId,
      personId: parsed.data.personId,
      person: {
        id: assignedPerson?.id ?? parsed.data.personId,
        name: assignedPerson?.name ?? "Membro",
        email: assignedPerson?.email ?? assignedPerson?.user?.email ?? null,
        image: assignedPerson?.image ?? assignedPerson?.user?.image ?? null,
      },
      function: { name: targetFunction.name },
    },
  };
}

export async function removeScheduleAssignmentAction(
  assignmentId: string,
): Promise<EventActionResult> {
  if (!assignmentId) {
    return { ok: false, error: "Escala inválida." };
  }

  const assignment = await db.query.scheduleAssignment.findFirst({
    where: eq(schema.scheduleAssignment.id, assignmentId),
    with: {
      schedule: { with: { event: true } },
      department: true,
      function: true,
      person: { with: { user: true } },
    },
  });

  if (!assignment) {
    return { ok: false, error: "Escala não encontrada." };
  }

  const result = await getScheduleAccess(
    assignment.schedule.eventId,
    assignment.departmentId,
  );

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  try {
    await db
      .delete(schema.scheduleAssignment)
      .where(eq(schema.scheduleAssignment.id, assignmentId));
  } catch (error) {
    console.error("Erro ao remover da escala", error);
    return { ok: false, error: "Não foi possível remover da escala." };
  }

  if (
    assignment.person.userId &&
    assignment.person.userId !== result.context.session.user.id
  ) {
    try {
      await createNotifications({
        organizationId: result.context.organization.id,
        userIds: [assignment.person.userId],
        actorId: result.context.session.user.id,
        type: "schedule_removed",
        title: `Você saiu da escala de ${assignment.schedule.event.title}`,
        body: `${assignment.department.name} · ${assignment.function.name} · ${formatEventFullDate(assignment.schedule.event.startsAt)} às ${formatEventTime(assignment.schedule.event.startsAt)}`,
        href: `/dashboard/events/${assignment.schedule.event.id}`,
      });
    } catch (error) {
      console.error("Erro ao notificar remoção da escala", error);
    }
  }

  await revalidateEvents(
    assignment.schedule.eventId,
    assignment.schedule.event.organizationId,
  );
  return { ok: true };
}

export type CopyScaleResult = {
  ok: boolean;
  error?: string;
  copiedCount?: number;
  assignments?: {
    id: string;
    departmentId: string;
    functionId: string;
    personId: string;
    person: {
      name: string;
      email: string | null;
      image: string | null;
      birthday: string | null;
      userId: string | null;
    };
    function: { name: string };
  }[];
};

/**
 * Copies the assignments of a department from the most recent earlier event
 * where that department served. People who left the department and functions
 * that no longer exist are skipped.
 */
export async function copyLastScaleAction(
  eventId: string,
  departmentId: string,
): Promise<CopyScaleResult> {
  if (!eventId || !departmentId) {
    return { ok: false, error: "Evento ou departamento inválido." };
  }

  const access = await getScheduleAccess(eventId, departmentId);

  if ("error" in access) {
    return { ok: false, error: access.error };
  }

  const [previous] = await db
    .select({ scheduleId: schema.schedule.id })
    .from(schema.scheduleAssignment)
    .innerJoin(
      schema.schedule,
      eq(schema.scheduleAssignment.scheduleId, schema.schedule.id),
    )
    .innerJoin(schema.event, eq(schema.schedule.eventId, schema.event.id))
    .where(
      and(
        eq(schema.event.organizationId, access.context.organization.id),
        eq(schema.scheduleAssignment.departmentId, departmentId),
        lt(schema.event.startsAt, access.event.startsAt),
      ),
    )
    .orderBy(desc(schema.event.startsAt))
    .limit(1);

  if (!previous) {
    return { ok: true, copiedCount: 0, assignments: [] };
  }

  const [previousAssignments, members, functions] = await Promise.all([
    db.query.scheduleAssignment.findMany({
      where: and(
        eq(schema.scheduleAssignment.scheduleId, previous.scheduleId),
        eq(schema.scheduleAssignment.departmentId, departmentId),
      ),
      columns: { functionId: true, personId: true },
    }),
    db.query.departmentMember.findMany({
      where: eq(schema.departmentMember.departmentId, departmentId),
      columns: { personId: true },
    }),
    db.query.departmentFunction.findMany({
      where: eq(schema.departmentFunction.departmentId, departmentId),
      columns: { id: true },
    }),
  ]);

  const memberIds = new Set(members.map((member) => member.personId));
  const functionIds = new Set(
    functions.map((departmentFunction) => departmentFunction.id),
  );
  const copyable = previousAssignments.filter(
    (assignment) =>
      memberIds.has(assignment.personId) &&
      functionIds.has(assignment.functionId),
  );

  if (copyable.length === 0) {
    return { ok: true, copiedCount: 0, assignments: [] };
  }

  const schedule = await getOrCreateSchedule(access.event.id);

  if (!schedule) {
    return { ok: false, error: "Não foi possível abrir a escala deste evento." };
  }

  const existingAssignments = await db.query.scheduleAssignment.findMany({
    where: eq(schema.scheduleAssignment.scheduleId, schedule.id),
    columns: { functionId: true, personId: true },
  });
  const existingKeys = new Set(
    existingAssignments.map(
      (assignment) => `${assignment.functionId}:${assignment.personId}`,
    ),
  );
  const newAssignments = copyable.filter(
    (assignment) =>
      !existingKeys.has(`${assignment.functionId}:${assignment.personId}`),
  );

  if (newAssignments.length === 0) {
    return { ok: true, copiedCount: 0, assignments: [] };
  }

  try {
    await db
      .insert(schema.scheduleAssignment)
      .values(
        newAssignments.map((assignment) => ({
          id: randomUUID(),
          scheduleId: schedule.id,
          departmentId,
          functionId: assignment.functionId,
          personId: assignment.personId,
        })),
      )
      .onConflictDoNothing();
  } catch (error) {
    console.error("Erro ao copiar escala", error);
    return { ok: false, error: "Não foi possível copiar a escala anterior." };
  }

  const saved = await db.query.scheduleAssignment.findMany({
    where: and(
      eq(schema.scheduleAssignment.scheduleId, schedule.id),
      eq(schema.scheduleAssignment.departmentId, departmentId),
    ),
    with: {
      person: true,
      function: true,
    },
  });

  await revalidateEvents(eventId, access.context.organization.id);

  return {
    ok: true,
    copiedCount: newAssignments.length,
    assignments: saved.map((assignment) => ({
      id: assignment.id,
      departmentId: assignment.departmentId,
      functionId: assignment.functionId,
      personId: assignment.personId,
      person: {
        name: assignment.person.name,
        email: assignment.person.email,
        image: assignment.person.image,
        birthday: assignment.person.birthday,
        userId: assignment.person.userId,
      },
      function: { name: assignment.function.name },
    })),
  };
}

async function canManageEventPlan(
  _organizationId: string,
  eventId: string,
  _userId: string,
  _isAdmin: boolean,
): Promise<boolean> {
  return can("schedules", "editPlan", { eventId });
}

const planItemSchema = z.object({
  eventId: z.string().min(1, "ID do evento é obrigatório."),
  type: z.enum(["header", "item"]).default("item"),
  title: z
    .string()
    .trim()
    .min(1, "Informe o título do item ou seção.")
    .max(120, "O título pode ter no máximo 120 caracteres."),
  description: optionalText(500, "A descrição pode ter no máximo 500 caracteres."),
  durationSeconds: z.coerce.number().min(0).default(0),
  personId: z.string().optional().or(z.literal("")),
  customResponsible: optionalText(120, "O responsável pode ter no máximo 120 caracteres."),
  sectionId: z.string().optional().or(z.literal("")),
  songId: z.string().optional().or(z.literal("")),
});

export type PlanItemFormState =
  | {
      error?: string;
      fieldErrors?: {
        title?: string[];
        description?: string[];
        durationSeconds?: string[];
      };
      success?: boolean;
    }
  | undefined;

export async function createPlanItemAction(
  _state: PlanItemFormState,
  formData: FormData,
): Promise<PlanItemFormState> {
  const parsed = planItemSchema.safeParse({
    eventId: formData.get("eventId"),
    type: formData.get("type") ?? "item",
    title: formData.get("title"),
    description: formData.get("description"),
    durationSeconds: formData.get("durationSeconds") ?? 0,
    personId: formData.get("personId") ?? undefined,
    customResponsible: formData.get("customResponsible") ?? undefined,
    sectionId: formData.get("sectionId") ?? undefined,
    songId: formData.get("songId") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    parsed.data.eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return {
      error: "Você não tem permissão para editar o cronograma deste evento.",
    };
  }

  const existingItems = await db.query.eventPlanItem.findMany({
    where: eq(schema.eventPlanItem.eventId, parsed.data.eventId),
    columns: { order: true },
  });

  const nextOrder =
    existingItems.reduce((max, item) => Math.max(max, item.order), -1) + 1;

  try {
    await db.insert(schema.eventPlanItem).values({
      id: randomUUID(),
      eventId: parsed.data.eventId,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      durationSeconds: parsed.data.durationSeconds,
      order: nextOrder,
      personId: parsed.data.personId || null,
      customResponsible: parsed.data.customResponsible || null,
      sectionId: parsed.data.sectionId || null,
      songId: parsed.data.songId || null,
    });
  } catch (error) {
    console.error("Erro ao criar item do cronograma", error);
    return { error: "Não foi possível adicionar o item ao cronograma." };
  }

  await revalidateEvents(parsed.data.eventId, context.organization.id);
  return { success: true };
}

export async function updatePlanItemAction(
  _state: PlanItemFormState,
  formData: FormData,
): Promise<PlanItemFormState> {
  const itemId = formData.get("id")?.toString();
  if (!itemId) {
    return { error: "Item não informado." };
  }

  const parsed = planItemSchema.safeParse({
    eventId: formData.get("eventId"),
    type: formData.get("type") ?? "item",
    title: formData.get("title"),
    description: formData.get("description"),
    durationSeconds: formData.get("durationSeconds") ?? 0,
    personId: formData.get("personId") ?? undefined,
    customResponsible: formData.get("customResponsible") ?? undefined,
    sectionId: formData.get("sectionId") ?? undefined,
    songId: formData.get("songId") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    parsed.data.eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return {
      error: "Você não tem permissão para editar o cronograma deste evento.",
    };
  }

  try {
    await db
      .update(schema.eventPlanItem)
      .set({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        durationSeconds: parsed.data.durationSeconds,
        personId: parsed.data.personId || null,
        customResponsible: parsed.data.customResponsible || null,
        songId: parsed.data.songId || null,
      })
      .where(eq(schema.eventPlanItem.id, itemId));
  } catch (error) {
    console.error("Erro ao atualizar item do cronograma", error);
    return { error: "Não foi possível salvar as alterações." };
  }

  await revalidateEvents(parsed.data.eventId, context.organization.id);
  return { success: true };
}

export async function deletePlanItemAction(
  itemId: string,
  eventId: string,
): Promise<EventActionResult> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return { ok: false, error: "Permissão insuficiente." };
  }

  try {
    await db
      .delete(schema.eventPlanItem)
      .where(eq(schema.eventPlanItem.id, itemId));
  } catch (error) {
    console.error("Erro ao remover item do cronograma", error);
    return { ok: false, error: "Não foi possível remover o item." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

export async function reorderPlanItemsAction(
  eventId: string,
  orderedIds: string[],
): Promise<EventActionResult> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return { ok: false, error: "Permissão insuficiente." };
  }

  try {
    for (let index = 0; index < orderedIds.length; index++) {
      await db
        .update(schema.eventPlanItem)
        .set({ order: index })
        .where(
          and(
            eq(schema.eventPlanItem.id, orderedIds[index]),
            eq(schema.eventPlanItem.eventId, eventId),
          ),
        );
    }
  } catch (error) {
    console.error("Erro ao reordenar cronograma", error);
    return { ok: false, error: "Não foi possível reordenar o cronograma." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

const STARTER_PLAN_TEMPLATE: schema.PlanTemplateItem[] = [
  { type: "header", title: "INTRODUÇÃO & ABERTURA", durationSeconds: 0, order: 0 },
  {
    type: "item",
    title: "Oração Inicial e Boas-Vindas",
    durationSeconds: 300,
    order: 1,
    description: "Acolhimento da congregação e oração de abertura.",
  },
  { type: "header", title: "LOUVOR & ADORAÇÃO", durationSeconds: 0, order: 2 },
  {
    type: "item",
    title: "Momento de Louvor Congregacional",
    durationSeconds: 1200,
    order: 3,
    description: "Músicas e adoração com o ministério de louvor.",
  },
  { type: "header", title: "COMUNHÃO & AVISOS", durationSeconds: 0, order: 4 },
  {
    type: "item",
    title: "Avisos e Recepção de Visitantes",
    durationSeconds: 300,
    order: 5,
    description: "Avisos gerais e acolhimento dos que nos visitam pela primeira vez.",
  },
  {
    type: "item",
    title: "Dízimos e Ofertas",
    durationSeconds: 420,
    order: 6,
    description: "Oração e cântico de gratidão pelas ofertas.",
  },
  { type: "header", title: "MINISTRAÇÃO DA PALAVRA", durationSeconds: 0, order: 7 },
  {
    type: "item",
    title: "Pregação da Palavra",
    durationSeconds: 2100,
    order: 8,
    description: "Ministração bíblica principal.",
  },
  { type: "header", title: "ENCERRAMENTO", durationSeconds: 0, order: 9 },
  {
    type: "item",
    title: "Apelo / Oração Final e Bênção Apostólica",
    durationSeconds: 480,
    order: 10,
    description: "Oração pastoral e encerramento.",
  },
];

export async function savePlanAsTemplateAction(
  eventId: string,
  name: string,
  description?: string,
): Promise<{ ok: boolean; error?: string; templateId?: string }> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );
  if (!canManage) {
    return { ok: false, error: "Permissão insuficiente para salvar modelo." };
  }

  const canManageTemplates = await can("schedules", "manageTemplates");
  if (!canManageTemplates) {
    return {
      ok: false,
      error: "Você não tem permissão para gerenciar modelos de cronograma.",
    };
  }

  if (!name || !name.trim()) {
    return { ok: false, error: "Informe um nome para o modelo." };
  }

  try {
    const rawItems = await db.query.eventPlanItem.findMany({
      where: eq(schema.eventPlanItem.eventId, eventId),
      orderBy: [asc(schema.eventPlanItem.order)],
      with: {
        person: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (rawItems.length === 0) {
      return {
        ok: false,
        error:
          "O cronograma está vazio. Adicione momentos antes de salvar como modelo.",
      };
    }

    const items: schema.PlanTemplateItem[] = rawItems.map((item, index) => ({
      type: item.type as "header" | "item",
      title: item.title,
      description: item.description,
      durationSeconds: item.durationSeconds,
      order: index,
      customResponsible: item.customResponsible ?? (item.person?.name || null),
      songId: item.songId ?? null,
    }));

    const id = randomUUID();
    await db.insert(schema.planTemplate).values({
      id,
      organizationId: context.organization.id,
      name: name.trim(),
      description: description?.trim() || null,
      items,
    });

    return { ok: true, templateId: id };
  } catch (error) {
    console.error("Erro ao salvar modelo de cronograma", error);
    return { ok: false, error: "Não foi possível salvar o modelo." };
  }
}

export type SavedPlanTemplate = {
  id: string;
  name: string;
  description: string | null;
  items: schema.PlanTemplateItem[];
  createdAt: Date;
  updatedAt: Date;
};

export async function listPlanTemplatesAction(): Promise<{
  ok: boolean;
  templates?: SavedPlanTemplate[];
  error?: string;
}> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canRead = await can("schedules", "read");
  if (!canRead) {
    return {
      ok: false,
      error: "Você não tem permissão para visualizar modelos de cronograma.",
    };
  }

  try {
    const templates = await db.query.planTemplate.findMany({
      where: eq(schema.planTemplate.organizationId, context.organization.id),
      orderBy: [desc(schema.planTemplate.createdAt)],
    });

    return { ok: true, templates };
  } catch (error) {
    console.error("Erro ao listar modelos de cronograma", error);
    return { ok: false, error: "Não foi possível carregar os modelos." };
  }
}

export async function applyPlanTemplateAction(
  eventId: string,
  templateId: string | "starter",
): Promise<EventActionResult> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );
  if (!canManage) {
    return { ok: false, error: "Permissão insuficiente." };
  }

  let itemsToApply: schema.PlanTemplateItem[] = [];

  if (templateId === "starter") {
    itemsToApply = STARTER_PLAN_TEMPLATE;
  } else {
    const template = await db.query.planTemplate.findFirst({
      where: and(
        eq(schema.planTemplate.id, templateId),
        eq(schema.planTemplate.organizationId, context.organization.id),
      ),
    });

    if (!template) {
      return { ok: false, error: "Modelo não encontrado." };
    }

    itemsToApply = template.items;
  }

  try {
    await db
      .delete(schema.eventPlanItem)
      .where(eq(schema.eventPlanItem.eventId, eventId));

    for (let index = 0; index < itemsToApply.length; index++) {
      const item = itemsToApply[index];
      await db.insert(schema.eventPlanItem).values({
        id: randomUUID(),
        eventId,
        type: item.type,
        title: item.title,
        description: item.description ?? null,
        durationSeconds: item.durationSeconds ?? 0,
        order: index,
        customResponsible: item.customResponsible ?? null,
        songId: item.songId ?? null,
      });
    }
  } catch (error) {
    console.error("Erro ao aplicar modelo no cronograma", error);
    return { ok: false, error: "Não foi possível aplicar o modelo." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

export async function deletePlanTemplateAction(
  templateId: string,
): Promise<EventActionResult> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManageTemplates = await can("schedules", "manageTemplates");
  if (!canManageTemplates) {
    return {
      ok: false,
      error: "Você não tem permissão para excluir modelos de cronograma.",
    };
  }

  try {
    await db
      .delete(schema.planTemplate)
      .where(
        and(
          eq(schema.planTemplate.id, templateId),
          eq(schema.planTemplate.organizationId, context.organization.id),
        ),
      );
    return { ok: true };
  } catch (error) {
    console.error("Erro ao excluir modelo de cronograma", error);
    return { ok: false, error: "Não foi possível excluir o modelo." };
  }
}

export async function clearEventPlanAction(
  eventId: string,
): Promise<EventActionResult> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );
  if (!canManage) {
    return { ok: false, error: "Permissão insuficiente." };
  }

  try {
    await db
      .delete(schema.eventPlanItem)
      .where(eq(schema.eventPlanItem.eventId, eventId));
  } catch (error) {
    console.error("Erro ao limpar cronograma", error);
    return { ok: false, error: "Não foi possível limpar o cronograma." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

export async function importPlanItemsAction(
  eventId: string,
  items: schema.PlanTemplateItem[],
): Promise<EventActionResult> {
  const context = await getOrganizationContext();
  if (!context) {
    return { ok: false, error: "Sua sessão expirou." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );
  if (!canManage) {
    return { ok: false, error: "Permissão insuficiente." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Arquivo de cronograma vazio ou inválido." };
  }

  try {
    await db
      .delete(schema.eventPlanItem)
      .where(eq(schema.eventPlanItem.eventId, eventId));

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!item.title) continue;
      await db.insert(schema.eventPlanItem).values({
        id: randomUUID(),
        eventId,
        type: item.type === "header" ? "header" : "item",
        title: item.title.trim(),
        description: item.description ? String(item.description).trim() : null,
        durationSeconds:
          typeof item.durationSeconds === "number" && item.durationSeconds >= 0
            ? Math.round(item.durationSeconds)
            : 0,
        order: index,
        customResponsible: item.customResponsible
          ? String(item.customResponsible).trim()
          : null,
        songId: item.songId ? String(item.songId).trim() : null,
      });
    }
  } catch (error) {
    console.error("Erro ao importar cronograma", error);
    return { ok: false, error: "Não foi possível importar o cronograma." };
  }

  await revalidateEvents(eventId, context.organization.id);
  return { ok: true };
}

export async function getEventPublicShareInfoAction(eventId: string) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.id, eventId),
      eq(schema.event.organizationId, context.organization.id),
    ),
    columns: {
      id: true,
      isPublicShareEnabled: true,
      publicShareToken: true,
      publicShareAllowPdf: true,
      publicShareUpdatedAt: true,
    },
  });

  if (!event) {
    return { error: "Evento não encontrado." };
  }

  return {
    ok: true,
    isPublicShareEnabled: event.isPublicShareEnabled,
    publicShareToken: event.publicShareToken,
    publicShareAllowPdf: event.publicShareAllowPdf,
    publicShareUpdatedAt: event.publicShareUpdatedAt,
  };
}

export async function toggleEventPublicShareAction(input: {
  eventId: string;
  enabled: boolean;
  allowPdf?: boolean;
}) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    input.eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return {
      error:
        "Você não tem permissão para alterar o compartilhamento deste cronograma.",
    };
  }

  const event = await db.query.event.findFirst({
    where: and(
      eq(schema.event.id, input.eventId),
      eq(schema.event.organizationId, context.organization.id),
    ),
    columns: {
      id: true,
      publicShareToken: true,
      publicShareAllowPdf: true,
    },
  });

  if (!event) {
    return { error: "Evento não encontrado." };
  }

  const token =
    event.publicShareToken || randomUUID().replace(/-/g, "").slice(0, 16);
  const allowPdf =
    input.allowPdf !== undefined ? input.allowPdf : event.publicShareAllowPdf;

  await db
    .update(schema.event)
    .set({
      isPublicShareEnabled: input.enabled,
      publicShareToken: token,
      publicShareAllowPdf: allowPdf,
      publicShareUpdatedAt: new Date(),
    })
    .where(eq(schema.event.id, input.eventId));

  await revalidateEvents(input.eventId, context.organization.id);

  return {
    ok: true,
    isPublicShareEnabled: input.enabled,
    publicShareToken: token,
    publicShareAllowPdf: allowPdf,
  };
}

export async function regenerateEventPublicShareTokenAction(eventId: string) {
  const context = await getOrganizationContext();
  if (!context) {
    return { error: "Sessão expirada." };
  }

  const canManage = await canManageEventPlan(
    context.organization.id,
    eventId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!canManage) {
    return {
      error:
        "Você não tem permissão para alterar o compartilhamento deste cronograma.",
    };
  }

  const newToken = randomUUID().replace(/-/g, "").slice(0, 16);

  await db
    .update(schema.event)
    .set({
      publicShareToken: newToken,
      publicShareUpdatedAt: new Date(),
    })
    .where(eq(schema.event.id, eventId));

  await revalidateEvents(eventId, context.organization.id);

  return {
    ok: true,
    publicShareToken: newToken,
  };
}
