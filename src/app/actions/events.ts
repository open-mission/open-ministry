"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getDepartmentAccess } from "@/lib/departments";
import { EVENT_KINDS, RECURRENCE_OPTIONS } from "@/lib/event-options";
import {
  applyTimeOfDay,
  endOfDayInZone,
  formatEventFullDate,
  formatEventTime,
  generateOccurrences,
  getEvent,
  zonedDateTimeToUtc,
} from "@/lib/events";
import { createNotifications } from "@/lib/notifications";
import { getOrganizationContext } from "@/lib/organizations";

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
    z.number().int().min(1).max(12).optional(),
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

async function getAdminContext() {
  const context = await getOrganizationContext();

  if (!context) {
    return {
      error: "Sua sessão expirou ou você não tem uma igreja ativa.",
    } as const;
  }

  if (!context.isAdmin) {
    return {
      error: "Só administradores da igreja podem gerenciar cultos e eventos.",
    } as const;
  }

  return { context } as const;
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

function revalidateEvents(eventId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/schedules");

  if (eventId) {
    revalidatePath(`/dashboard/events/${eventId}`);
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

  const result = await getAdminContext();

  if ("error" in result) {
    return { error: result.error };
  }

  const organizationId = result.context.organization.id;
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

  const occurrences = generateOccurrences({
    startsAt,
    endsAt,
    recurrence,
    recurrenceInterval: parsed.data.recurrenceInterval ?? null,
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
        recurrenceInterval:
          recurrence === "custom"
            ? (parsed.data.recurrenceInterval ?? null)
            : null,
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

  revalidateEvents(eventIds[0]);
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

  const result = await getAdminContext();

  if ("error" in result) {
    return { error: result.error };
  }

  const organizationId = result.context.organization.id;
  const event = await getEvent(organizationId, parsed.data.eventId);

  if (!event) {
    return { error: "Evento não encontrado." };
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
    }
  } catch (error) {
    console.error("Erro ao atualizar evento", error);
    return { error: "Não foi possível salvar o evento." };
  }

  revalidateEvents(event.id);
  return { success: true };
}

export async function deleteEventAction(
  eventId: string,
  scope: "single" | "series",
): Promise<EventActionResult> {
  if (!eventId) {
    return { ok: false, error: "Evento inválido." };
  }

  const result = await getAdminContext();

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  const event = await getEvent(result.context.organization.id, eventId);

  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

  try {
    if (scope === "series" && event.seriesId) {
      await db
        .delete(schema.event)
        .where(
          and(
            eq(schema.event.organizationId, result.context.organization.id),
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

  revalidateEvents(event.id);
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

  const access = await getDepartmentAccess(
    context.organization.id,
    departmentId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!access || !access.canManage) {
    return {
      error:
        "Só administradores e líderes deste departamento podem montar a escala.",
    } as const;
  }

  return { context, event, access } as const;
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

  try {
    await db.insert(schema.scheduleAssignment).values({
      id: randomUUID(),
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

  if (
    assignedPerson?.userId &&
    assignedPerson.userId !== result.context.session.user.id
  ) {
    try {
      await createNotifications({
        organizationId: result.context.organization.id,
        userIds: [assignedPerson.userId],
        actorId: result.context.session.user.id,
        type: "schedule_assigned",
        title: `Você foi escalado em ${result.event.title}`,
        body: `${result.access.department.name} · ${targetFunction.name} · ${formatEventFullDate(result.event.startsAt)} às ${formatEventTime(result.event.startsAt)}`,
        href: `/dashboard/events/${result.event.id}`,
      });
    } catch (error) {
      console.error("Erro ao notificar escala", error);
    }
  }

  revalidateEvents(parsed.data.eventId);
  return { success: true };
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

  revalidateEvents(assignment.schedule.eventId);
  return { ok: true };
}
