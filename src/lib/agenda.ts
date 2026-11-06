import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";

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

export async function getPersonAssignments(
  organizationId: string,
  personId: string,
) {
  const rows = await db.query.scheduleAssignment.findMany({
    where: eq(schema.scheduleAssignment.personId, personId),
    with: {
      schedule: {
        with: { event: true },
      },
      function: true,
      department: true,
    },
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

  const rows = await db.query.eventDepartment.findMany({
    where: inArray(schema.eventDepartment.departmentId, departmentIds),
    with: {
      event: true,
      department: true,
    },
  });
  const now = Date.now();
  const byEvent = new Map<string, AgendaEvent>();

  for (const row of rows) {
    if (
      row.event.organizationId !== organizationId ||
      row.event.endsAt.getTime() < now
    ) {
      continue;
    }

    const current = byEvent.get(row.event.id);

    if (current) {
      if (
        !current.departments.some(
          (department) => department.id === row.departmentId,
        )
      ) {
        current.departments.push({
          id: row.departmentId,
          name: row.department.name,
        });
      }
    } else {
      byEvent.set(row.event.id, {
        event: row.event,
        departments: [
          { id: row.departmentId, name: row.department.name },
        ],
      });
    }
  }

  return [...byEvent.values()]
    .sort(
      (a, b) =>
        a.event.startsAt.getTime() - b.event.startsAt.getTime(),
    )
    .slice(0, limit);
}
