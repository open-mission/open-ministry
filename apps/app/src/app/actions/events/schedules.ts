"use server";

import { randomUUID } from "node:crypto";
import { and, desc, eq, lt } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  formatEventFullDate,
  formatEventTime,
  getEvent,
} from "@/lib/events";
import { createNotifications } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notification-service";
import { getOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import {
  isUniqueViolation,
  type CopyScaleResult,
  revalidateEvents,
  scheduleAssignmentSchema,
  type EventActionResult,
  type ScheduleFormState,
} from "@/lib/events/action-helpers";

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

  const configuredFunctions = await db.query.eventDepartmentFunction.findMany({
    where: and(
      eq(schema.eventDepartmentFunction.eventId, parsed.data.eventId),
      eq(schema.eventDepartmentFunction.departmentId, parsed.data.departmentId),
    ),
    columns: { functionId: true },
  });

  if (
    configuredFunctions.length > 0 &&
    !configuredFunctions.some((cf) => cf.functionId === parsed.data.functionId)
  ) {
    return { error: "Esta função não está ativa para este evento." };
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

  const configuredFunctions = await db.query.eventDepartmentFunction.findMany({
    where: and(
      eq(schema.eventDepartmentFunction.eventId, access.event.id),
      eq(schema.eventDepartmentFunction.departmentId, departmentId),
    ),
    columns: { functionId: true },
  });

  const activeFunctionIds =
    configuredFunctions.length > 0
      ? new Set(configuredFunctions.map((cf) => cf.functionId))
      : functionIds;

  const copyable = previousAssignments.filter(
    (assignment) =>
      memberIds.has(assignment.personId) &&
      activeFunctionIds.has(assignment.functionId),
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
