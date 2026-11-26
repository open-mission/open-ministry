import "server-only";

import { and, asc, eq, gte, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import { findPersonByUserId } from "@/lib/people";

export async function getPersonMemberships(personId: string) {
  return db.query.departmentMember.findMany({
    where: eq(schema.departmentMember.personId, personId),
    with: {
      department: true,
      assignments: {
        with: { function: true },
      },
    },
    orderBy: (memberships, { desc }) => [desc(memberships.isLeader)],
  });
}

export type PersonMembership = Awaited<
  ReturnType<typeof getPersonMemberships>
>[number];

/**
 * Variante cacheada por usuário para o dashboard. Evita repetir a consulta de
 * vínculos a cada carregamento e permite buscar membros e permissões em
 * paralelo com o restante da página.
 */
export async function getPersonMembershipsForUser(
  organizationId: string,
  userId: string,
) {
  return remember(
    `org:${organizationId}:user:${userId}:memberships`,
    120,
    async () => {
      const person = await findPersonByUserId(organizationId, userId);

      if (!person) {
        return [];
      }

      return db.query.departmentMember.findMany({
        where: eq(schema.departmentMember.personId, person.id),
        with: {
          department: true,
          assignments: {
            with: { function: true },
          },
        },
        orderBy: (memberships, { desc }) => [desc(memberships.isLeader)],
      });
    },
    [
      `people:${organizationId}`,
      `departments:${organizationId}`,
      `permissions:${organizationId}`,
    ],
  );
}

export async function getPersonAssignments(
  organizationId: string,
  personId: string,
) {
  return remember(
    `org:${organizationId}:person:${personId}:assignments`,
    120,
    async () => {
      const rows = await db.query.scheduleAssignment.findMany({
        where: eq(schema.scheduleAssignment.personId, personId),
        with: {
          schedule: {
            with: { event: true },
          },
          function: true,
          department: true,
        },
        // Histórico antigo não pode ser lido sem teto: limita o número de
        // atribuições consideradas nesta visão.
        limit: 500,
      });

      return rows
        .filter(
          (assignment) =>
            assignment.schedule.event.organizationId === organizationId,
        )
        .sort(
          (a, b) =>
            a.schedule.event.startsAt.getTime() -
            b.schedule.event.startsAt.getTime(),
        );
    },
    [`events:${organizationId}`, `people:${organizationId}`],
  );
}

export type UpcomingAssignment = Awaited<
  ReturnType<typeof getPersonAssignments>
>[number];

export function splitAssignments(
  assignments: UpcomingAssignment[],
  now: Date = new Date(),
) {
  const timestamp = now.getTime();
  const upcoming = assignments.filter(
    (assignment) => assignment.schedule.event.endsAt.getTime() >= timestamp,
  );
  const past = assignments
    .filter(
      (assignment) => assignment.schedule.event.endsAt.getTime() < timestamp,
    )
    .reverse();

  return { upcoming, past };
}

export async function getUpcomingAssignments(
  organizationId: string,
  personId: string,
  limit = 6,
) {
  const now = Date.now();
  const rows = await getPersonAssignments(organizationId, personId);

  return rows
    .filter(
      (assignment) => assignment.schedule.event.endsAt.getTime() >= now,
    )
    .slice(0, limit);
}

export type AgendaEvent = {
  event: typeof schema.event.$inferSelect;
  departments: { id: string; name: string }[];
};

export async function getDepartmentAgenda(
  organizationId: string,
  personId: string,
  limit = 6,
): Promise<AgendaEvent[]> {
  const memberships = await db.query.departmentMember.findMany({
    where: eq(schema.departmentMember.personId, personId),
    columns: { departmentId: true },
  });
  const departmentIds = memberships.map(
    (membership) => membership.departmentId,
  );

  if (departmentIds.length === 0) {
    return [];
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 6, 1), 100);
  // Organização, janela de datas e ordem são resolvidas no banco: antes, a
  // consulta trazia todo o vínculo evento/departamento e filtrava em JS.
  const rows = await db
    .select({
      event: schema.event,
      departmentId: schema.eventDepartment.departmentId,
      departmentName: schema.department.name,
    })
    .from(schema.eventDepartment)
    .innerJoin(
      schema.event,
      eq(schema.eventDepartment.eventId, schema.event.id),
    )
    .innerJoin(
      schema.department,
      eq(schema.eventDepartment.departmentId, schema.department.id),
    )
    .where(
      and(
        eq(schema.event.organizationId, organizationId),
        gte(schema.event.endsAt, new Date()),
        inArray(schema.eventDepartment.departmentId, departmentIds),
      ),
    )
    .orderBy(asc(schema.event.startsAt))
    .limit(Math.max(safeLimit * 4, 24));
  const byEvent = new Map<string, AgendaEvent>();

  for (const row of rows) {
    const current = byEvent.get(row.event.id);

    if (current) {
      if (
        !current.departments.some(
          (department) => department.id === row.departmentId,
        )
      ) {
        current.departments.push({
          id: row.departmentId,
          name: row.departmentName,
        });
      }
    } else {
      byEvent.set(row.event.id, {
        event: row.event,
        departments: [{ id: row.departmentId, name: row.departmentName }],
      });
    }
  }

  return [...byEvent.values()].slice(0, safeLimit);
}
