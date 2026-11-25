import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import {
  DEFAULT_REHEARSAL_ALERTS,
  type RehearsalAlertRule,
} from "@/features/rehearsals/lib/rehearsal-alerts";
import type {
  DepartmentRehearsalAlertRow,
} from "./rehearsal-schemas";

/** Helpers internos compartilhados por CRUD, regras de alerta e lembretes. */
type RehearsalEventRow = typeof schema.event.$inferSelect;

async function requireDepartment(
  organizationId: string,
  departmentId: string,
) {
  const department = await db.query.department.findFirst({
    where: and(
      eq(schema.department.id, departmentId),
      eq(schema.department.organizationId, organizationId),
    ),
    columns: { id: true, name: true, organizationId: true },
  });

  if (!department) {
    throw new Error("Departamento não encontrado.");
  }

  return department;
}

function toRuleInput(rule: DepartmentRehearsalAlertRow): RehearsalAlertRule {
  return {
    id: rule.id,
    label: rule.label,
    triggerType: rule.triggerType,
    offsetMinutes: rule.offsetMinutes,
    timeOfDay: rule.timeOfDay,
    channels: rule.channels,
    enabled: rule.enabled,
    isDefault: rule.isDefault,
    sortOrder: rule.sortOrder,
  };
}

function cacheTags(organizationId: string, departmentId: string) {
  return [
    `events:${organizationId}`,
    `departments:${organizationId}`,
    `rehearsals:${organizationId}:all`,
    `rehearsals:${organizationId}:${departmentId}`,
  ];
}

async function invalidateRehearsalCaches(
  organizationId: string,
  departmentId: string,
  eventId?: string,
) {
  const tags = cacheTags(organizationId, departmentId);
  if (eventId) {
    tags.push(`event:${eventId}`, `rehearsal:${eventId}`);
  }
  await cacheInvalidateTags(...tags);
}

export async function getOrSeedDepartmentAlertRules(
  organizationId: string,
  departmentId: string,
): Promise<DepartmentRehearsalAlertRow[]> {
  await requireDepartment(organizationId, departmentId);

  const existing = await db.query.departmentRehearsalAlert.findMany({
    where: and(
      eq(schema.departmentRehearsalAlert.organizationId, organizationId),
      eq(schema.departmentRehearsalAlert.departmentId, departmentId),
    ),
    orderBy: (table, { asc: ascending }) => [
      ascending(table.sortOrder),
      ascending(table.createdAt),
    ],
  });

  if (existing.length > 0) {
    return existing;
  }

  await db
    .insert(schema.departmentRehearsalAlert)
    .values(
      DEFAULT_REHEARSAL_ALERTS.map((rule, index) => ({
        id: randomUUID(),
        organizationId,
        departmentId,
        label: rule.label,
        triggerType: rule.triggerType,
        offsetMinutes: rule.offsetMinutes ?? null,
        timeOfDay: rule.timeOfDay ?? null,
        channels: rule.channels,
        enabled: rule.enabled ?? true,
        isDefault: true,
        sortOrder: rule.sortOrder ?? index,
      })),
    )
    .onConflictDoNothing();

  return db.query.departmentRehearsalAlert.findMany({
    where: and(
      eq(schema.departmentRehearsalAlert.organizationId, organizationId),
      eq(schema.departmentRehearsalAlert.departmentId, departmentId),
    ),
    orderBy: (table, { asc: ascending }) => [
      ascending(table.sortOrder),
      ascending(table.createdAt),
    ],
  });
}

export type { RehearsalEventRow };
export { requireDepartment, toRuleInput, invalidateRehearsalCaches };
