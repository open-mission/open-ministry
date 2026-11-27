import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import { EVENT_KINDS, RECURRENCE_OPTIONS } from "@/lib/event-options";
import { can } from "@/lib/permissions/service";

/** Helpers compartilhados pelas Server Actions de eventos. NUNCA exportar de um arquivo "use server". */
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
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/schedules");
  revalidatePath("/calendar");

  if (eventId) {
    revalidatePath(`/events/${eventId}`);
  }

  if (organizationId) {
    const tags = [`events:${organizationId}`];
    if (eventId) {
      tags.push(`event:${eventId}`);
    }
    await cacheInvalidateTags(...tags);
  }
}

function functionsFromForm(formData: FormData) {
  const raw = formData.getAll("functions");
  const result: string[] = [];

  for (const item of raw) {
    if (typeof item === "string" && item.trim().length > 0) {
      result.push(item.trim());
    }
  }

  return Array.from(new Set(result));
}

async function validateDepartmentFunctions(
  _organizationId: string,
  departmentIds: string[],
  functionIds: string[],
  hasFunctionsInForm: boolean,
) {
  if (departmentIds.length === 0) {
    return [];
  }

  const rows = await db.query.departmentFunction.findMany({
    where: inArray(schema.departmentFunction.departmentId, departmentIds),
    columns: { id: true, departmentId: true },
  });

  if (rows.length === 0) {
    return [];
  }

  // If the form didn't include function controls (e.g. legacy/automated scripts),
  // default to all functions of the active departments:
  if (!hasFunctionsInForm) {
    return rows.map((row) => ({
      departmentId: row.departmentId,
      functionId: row.id,
    }));
  }

  const submittedSet = new Set(functionIds);
  return rows
    .filter((row) => submittedSet.has(row.id))
    .map((row) => ({
      departmentId: row.departmentId,
      functionId: row.id,
    }));
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

async function replaceEventDepartmentFunctions(
  eventIds: string[],
  entries: { departmentId: string; functionId: string }[],
) {
  if (eventIds.length === 0) {
    return;
  }

  await db
    .delete(schema.eventDepartmentFunction)
    .where(inArray(schema.eventDepartmentFunction.eventId, eventIds));

  if (entries.length === 0) {
    return;
  }

  await db.insert(schema.eventDepartmentFunction).values(
    eventIds.flatMap((eventId) =>
      entries.map((entry) => ({
        id: randomUUID(),
        eventId,
        departmentId: entry.departmentId,
        functionId: entry.functionId,
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

/**
 * When a specific function is excluded from an event, remove its assignments
 * so volunteers aren't left scheduled for duties that won't happen.
 */
async function removeAssignmentsForRemovedFunctions(
  eventIds: string[],
  keptFunctionIds: string[],
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
        keptFunctionIds.length > 0
          ? notInArray(
              schema.scheduleAssignment.functionId,
              keptFunctionIds,
            )
          : undefined,
      ),
    );
}

async function canManageEventPlan(
  _organizationId: string,
  eventId: string,
  _userId: string,
  _isAdmin: boolean,
): Promise<boolean> {
  return can("schedules", "editPlan", { eventId });
}

export {
  optionalText,
  createEventSchema,
  updateEventSchema,
  scheduleAssignmentSchema,
  isUniqueViolation,
  departmentsFromForm,
  validateDepartments,
  functionsFromForm,
  validateDepartmentFunctions,
  replaceEventDepartments,
  replaceEventDepartmentFunctions,
  removeAssignmentsForRemovedDepartments,
  removeAssignmentsForRemovedFunctions,
  revalidateEvents,
  canManageEventPlan,
};
