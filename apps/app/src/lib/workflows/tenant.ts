import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";

/** WHERE reutilizável: job + organização, usado em todas as mutações. */
export function jobInOrganizationWhere(jobId: string, organizationId: string) {
  return and(
    eq(schema.backgroundJob.id, jobId),
    eq(schema.backgroundJob.organizationId, organizationId),
  );
}

export async function requireJobInOrganization(
  jobId: string,
  organizationId: string,
) {
  const job = await db.query.backgroundJob.findFirst({
    where: jobInOrganizationWhere(jobId, organizationId),
    columns: { id: true, status: true },
  });
  if (!job) throw new Error("Tarefa não encontrada nesta organização");
  return job;
}

export async function departmentBelongsToOrganization(
  departmentId: string,
  organizationId: string,
): Promise<boolean> {
  const department = await db.query.department.findFirst({
    where: and(
      eq(schema.department.id, departmentId),
      eq(schema.department.organizationId, organizationId),
    ),
    columns: { id: true },
  });
  return Boolean(department);
}
