import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";

export async function listDepartments(organizationId: string) {
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
    },
    orderBy: (departments, { asc }) => [asc(departments.name)],
  });
}

export async function getDepartment(
  organizationId: string,
  departmentId: string,
) {
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
    },
  });
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
