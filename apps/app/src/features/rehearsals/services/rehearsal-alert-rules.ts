import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  saveRehearsalAlertRulesSchema,
  type DepartmentRehearsalAlertRow,
} from "./rehearsal-schemas";
import {
  getOrSeedDepartmentAlertRules,
  invalidateRehearsalCaches,
  requireDepartment,
} from "./rehearsal-shared";
import { rescheduleDepartmentReminders } from "./rehearsal-reminders";

export { getOrSeedDepartmentAlertRules } from "./rehearsal-shared";

/* Regras de lembrete do setor */
export async function saveDepartmentAlertRules(
  organizationId: string,
  departmentId: string,
  rules: unknown,
): Promise<DepartmentRehearsalAlertRow[]> {
  const parsed = saveRehearsalAlertRulesSchema.parse({ rules });
  await requireDepartment(organizationId, departmentId);

  const existing = await db.query.departmentRehearsalAlert.findMany({
    where: and(
      eq(schema.departmentRehearsalAlert.organizationId, organizationId),
      eq(schema.departmentRehearsalAlert.departmentId, departmentId),
    ),
    columns: { id: true },
  });
  const existingIds = new Set(existing.map((rule) => rule.id));

  const keptIds: string[] = [];
  for (const [index, rule] of parsed.rules.entries()) {
    const values = {
      label: rule.label,
      triggerType: rule.triggerType,
      offsetMinutes:
        rule.triggerType === "offset_minutes"
          ? (rule.offsetMinutes ?? 0)
          : null,
      timeOfDay:
        rule.triggerType === "day_of_at_time" ? (rule.timeOfDay ?? null) : null,
      channels: rule.channels,
      enabled: rule.enabled ?? true,
      sortOrder: index,
      updatedAt: new Date(),
    };

    if (rule.id && existingIds.has(rule.id)) {
      await db
        .update(schema.departmentRehearsalAlert)
        .set(values)
        .where(
          and(
            eq(schema.departmentRehearsalAlert.id, rule.id),
            eq(schema.departmentRehearsalAlert.departmentId, departmentId),
          ),
        );
      keptIds.push(rule.id);
    } else {
      const id = randomUUID();
      await db.insert(schema.departmentRehearsalAlert).values({
        id,
        organizationId,
        departmentId,
        ...values,
      });
      keptIds.push(id);
    }
  }

  const removedIds = [...existingIds].filter((id) => !keptIds.includes(id));
  if (removedIds.length > 0) {
    await db
      .delete(schema.departmentRehearsalAlert)
      .where(inArray(schema.departmentRehearsalAlert.id, removedIds));
  }

  await rescheduleDepartmentReminders(organizationId, departmentId);
  await invalidateRehearsalCaches(organizationId, departmentId);

  return getOrSeedDepartmentAlertRules(organizationId, departmentId);
}

export async function resetDepartmentAlertRules(
  organizationId: string,
  departmentId: string,
) {
  await requireDepartment(organizationId, departmentId);

  await db
    .delete(schema.departmentRehearsalAlert)
    .where(
      and(
        eq(schema.departmentRehearsalAlert.organizationId, organizationId),
        eq(schema.departmentRehearsalAlert.departmentId, departmentId),
      ),
    );

  const rules = await getOrSeedDepartmentAlertRules(
    organizationId,
    departmentId,
  );

  await rescheduleDepartmentReminders(organizationId, departmentId);
  await invalidateRehearsalCaches(organizationId, departmentId);

  return rules;
}
