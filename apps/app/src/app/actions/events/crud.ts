"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  applyTimeOfDay,
  endOfDayInZone,
  generateOccurrences,
  getEvent,
  getNthWeekdayInfo,
  zonedDateTimeToUtc,
} from "@/lib/events";
import { getOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import {
  createEventSchema,
  departmentsFromForm,
  functionsFromForm,
  revalidateEvents,
  removeAssignmentsForRemovedDepartments,
  removeAssignmentsForRemovedFunctions,
  replaceEventDepartments,
  replaceEventDepartmentFunctions,
  updateEventSchema,
  validateDepartments,
  validateDepartmentFunctions,
  type EventFormState,
} from "@/lib/events/action-helpers";

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

  const submittedFunctions = functionsFromForm(formData);
  const hasFunctionsInForm = formData.has("functions");

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

  const validDepartmentFunctionEntries = await validateDepartmentFunctions(
    organizationId,
    validDepartmentIds,
    submittedFunctions,
    hasFunctionsInForm,
  );

  if (hasFunctionsInForm && validDepartmentIds.length > 0) {
    const allDeptFunctions = await db.query.departmentFunction.findMany({
      where: inArray(schema.departmentFunction.departmentId, validDepartmentIds),
      columns: { id: true, departmentId: true },
    });
    const deptsWithFunctions = new Set(
      allDeptFunctions.map((fn) => fn.departmentId),
    );
    const deptsWithSelectedFunctions = new Set(
      validDepartmentFunctionEntries.map((entry) => entry.departmentId),
    );

    for (const deptId of validDepartmentIds) {
      if (
        deptsWithFunctions.has(deptId) &&
        !deptsWithSelectedFunctions.has(deptId)
      ) {
        return {
          fieldErrors: {
            departments: [
              "Selecione ao menos uma função para cada departamento ativo ou desmarque o departamento.",
            ],
          },
        };
      }
    }
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

      if (validDepartmentFunctionEntries.length > 0) {
        await db.insert(schema.eventDepartmentFunction).values(
          eventIds.flatMap((eventId) =>
            validDepartmentFunctionEntries.map((entry) => ({
              id: randomUUID(),
              eventId,
              departmentId: entry.departmentId,
              functionId: entry.functionId,
            })),
          ),
        );
      }
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
  redirect(`/events/${eventIds[0]}`);
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

  const submittedFunctions = functionsFromForm(formData);
  const hasFunctionsInForm = formData.has("functions");

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

  const validDepartmentFunctionEntries = await validateDepartmentFunctions(
    organizationId,
    validDepartmentIds,
    submittedFunctions,
    hasFunctionsInForm,
  );

  if (hasFunctionsInForm && validDepartmentIds.length > 0) {
    const allDeptFunctions = await db.query.departmentFunction.findMany({
      where: inArray(schema.departmentFunction.departmentId, validDepartmentIds),
      columns: { id: true, departmentId: true },
    });
    const deptsWithFunctions = new Set(
      allDeptFunctions.map((fn) => fn.departmentId),
    );
    const deptsWithSelectedFunctions = new Set(
      validDepartmentFunctionEntries.map((entry) => entry.departmentId),
    );

    for (const deptId of validDepartmentIds) {
      if (
        deptsWithFunctions.has(deptId) &&
        !deptsWithSelectedFunctions.has(deptId)
      ) {
        return {
          fieldErrors: {
            departments: [
              "Selecione ao menos uma função para cada departamento ativo ou desmarque o departamento.",
            ],
          },
        };
      }
    }
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
      await replaceEventDepartmentFunctions(
        seriesIds,
        validDepartmentFunctionEntries,
      );
      await removeAssignmentsForRemovedDepartments(
        seriesIds,
        validDepartmentIds,
      );
      await removeAssignmentsForRemovedFunctions(
        seriesIds,
        validDepartmentFunctionEntries.map((e) => e.functionId),
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
      await replaceEventDepartmentFunctions(
        [event.id],
        validDepartmentFunctionEntries,
      );
      await removeAssignmentsForRemovedDepartments(
        [event.id],
        validDepartmentIds,
      );
      await removeAssignmentsForRemovedFunctions(
        [event.id],
        validDepartmentFunctionEntries.map((e) => e.functionId),
      );
    }
  } catch (error) {
    console.error("Erro ao atualizar evento", error);
    return { error: "Não foi possível salvar o evento." };
  }

  await revalidateEvents(event.id, organizationId);
  return { success: true };
}
