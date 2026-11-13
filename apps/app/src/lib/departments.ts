import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import { findPersonByUserId } from "@/lib/people";

export async function listDepartments(organizationId: string) {
  return remember(
    `org:${organizationId}:departments`,
    300,
    async () => {
      return db.query.department.findMany({
        where: eq(schema.department.organizationId, organizationId),
        with: {
          functions: {
            orderBy: (functions, { asc }) => [asc(functions.createdAt)],
          },
          members: {
            with: {
              person: { with: { user: true } },
              assignments: {
                with: { function: true },
              },
            },
          },
          modules: true,
        },
        orderBy: (departments, { asc }) => [asc(departments.name)],
      });
    },
    [`departments:${organizationId}`],
  );
}

export type DepartmentOption = {
  id: string;
  name: string;
  functions?: { id: string; name: string }[];
};

/**
 * Lean department list for menus, selects, event creation and calendar filters.
 * Includes functions so event dialogues can configure which roles are needed.
 */
export async function listDepartmentOptions(organizationId: string) {
  return remember(
    `org:${organizationId}:department-options-v2`,
    300,
    async () => {
      return db.query.department.findMany({
        where: eq(schema.department.organizationId, organizationId),
        columns: { id: true, name: true },
        with: {
          functions: {
            columns: { id: true, name: true },
            orderBy: (functions, { asc }) => [asc(functions.createdAt)],
          },
        },
        orderBy: (departments, { asc }) => [asc(departments.name)],
      });
    },
    [`departments:${organizationId}`],
  );
}

/**
 * Loads the full records for a specific set of departments. Event screens only
 * need the departments acting in that event, not every department in the
 * church.
 */
export async function listDepartmentsByIds(
  organizationId: string,
  departmentIds: string[],
) {
  if (departmentIds.length === 0) {
    return [];
  }

  return db.query.department.findMany({
    where: and(
      eq(schema.department.organizationId, organizationId),
      inArray(schema.department.id, departmentIds),
    ),
    with: {
      functions: {
        orderBy: (functions, { asc }) => [asc(functions.createdAt)],
      },
      members: {
        with: {
          person: { with: { user: true } },
          assignments: {
            with: { function: true },
          },
        },
      },
      modules: true,
    },
    orderBy: (departments, { asc }) => [asc(departments.name)],
  });
}

export async function listUserLeaderDepartments(
  organizationId: string,
  userId: string,
) {
  const departments = await listDepartments(organizationId);

  return departments.filter((department) =>
    department.members.some(
      (member) => member.person?.userId === userId && member.isLeader,
    ),
  );
}

export async function getDepartment(
  organizationId: string,
  departmentId: string,
) {
  return remember(
    `org:${organizationId}:department:${departmentId}`,
    300,
    async () => {
      return db.query.department.findFirst({
        where: and(
          eq(schema.department.id, departmentId),
          eq(schema.department.organizationId, organizationId),
        ),
        with: {
          functions: {
            orderBy: (functions, { asc }) => [asc(functions.createdAt)],
          },
          members: {
            with: {
              person: { with: { user: true } },
              assignments: {
                with: { function: true },
              },
            },
          },
          modules: true,
        },
      });
    },
    [`departments:${organizationId}`, `department:${departmentId}`],
  );
}

export type DepartmentRecord = NonNullable<
  Awaited<ReturnType<typeof getDepartment>>
>;

export type DepartmentAccess = {
  department: DepartmentRecord;
  isLeader: boolean;
  canManage: boolean;
  canViewExperience: boolean;
  canManageLeaders: boolean;
};

export async function getDepartmentAccess(
  organizationId: string,
  departmentId: string,
  userId: string,
  isAdmin: boolean,
): Promise<DepartmentAccess | null> {
  const department = await getDepartment(organizationId, departmentId);

  if (!department) {
    return null;
  }

  const membership = department.members.find(
    (member) => member.person?.userId === userId,
  );
  const isLeader = membership?.isLeader ?? false;

  return {
    department,
    isLeader,
    canManage: isAdmin || isLeader,
    canViewExperience: isAdmin || isLeader,
    canManageLeaders: isAdmin,
  };
}

export async function getFunctionWithDepartment(functionId: string) {
  const row = await db.query.departmentFunction.findFirst({
    where: eq(schema.departmentFunction.id, functionId),
    with: { department: true },
  });

  return row ?? null;
}

export async function getDepartmentMemberWithDepartment(memberId: string) {
  const row = await db.query.departmentMember.findFirst({
    where: eq(schema.departmentMember.id, memberId),
    with: {
      department: true,
      person: { with: { user: true } },
    },
  });

  return row ?? null;
}

export async function getAssignmentWithDepartment(assignmentId: string) {
  const row = await db.query.departmentMemberFunction.findFirst({
    where: eq(schema.departmentMemberFunction.id, assignmentId),
    with: {
      member: {
        with: {
          department: true,
          person: { with: { user: true } },
        },
      },
    },
  });

  return row ?? null;
}

export async function isUserLeaderInAnyDepartment(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const person = await findPersonByUserId(organizationId, userId);
  if (!person) return false;

  const leadMember = await db.query.departmentMember.findFirst({
    where: and(
      eq(schema.departmentMember.personId, person.id),
      eq(schema.departmentMember.isLeader, true),
    ),
  });

  return Boolean(leadMember);
}
