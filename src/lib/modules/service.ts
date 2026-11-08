import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags, remember } from "@/lib/cache";
import { listDepartments } from "@/lib/departments";
import { SYSTEM_MODULES } from "./registry";
import type { ModuleKey } from "./types";

export { buildAccessibleNavGroups } from "./nav";

/**
 * Retorna as chaves dos módulos ativos de um departamento.
 */
export async function listDepartmentModuleKeys(
  departmentId: string,
): Promise<ModuleKey[]> {
  const rows = await db.query.departmentModule.findMany({
    where: eq(schema.departmentModule.departmentId, departmentId),
  });

  return rows.map((r) => r.moduleKey as ModuleKey);
}

/**
 * Ativa ou desativa um módulo para um determinado departamento.
 */
export async function setDepartmentModuleEnabled(
  organizationId: string,
  departmentId: string,
  moduleKey: ModuleKey,
  enabled: boolean,
): Promise<boolean> {
  if (enabled) {
    const existing = await db.query.departmentModule.findFirst({
      where: and(
        eq(schema.departmentModule.departmentId, departmentId),
        eq(schema.departmentModule.moduleKey, moduleKey),
      ),
    });

    if (!existing) {
      await db.insert(schema.departmentModule).values({
        id: crypto.randomUUID(),
        departmentId,
        moduleKey,
      });
    }
  } else {
    await db
      .delete(schema.departmentModule)
      .where(
        and(
          eq(schema.departmentModule.departmentId, departmentId),
          eq(schema.departmentModule.moduleKey, moduleKey),
        ),
      );
  }

  await cacheInvalidateTags(
    `departments:${organizationId}`,
    `department:${departmentId}`,
    `modules:${organizationId}`,
  );

  return true;
}

/**
 * Determina quais módulos estão liberados para o usuário atual na igreja.
 * Admins/owners têm acesso a todos os módulos do sistema.
 * Membros regulares têm acesso se pertencerem a pelo menos um departamento onde o módulo está ativo.
 */
export async function getUserAccessibleModuleKeys(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
): Promise<ModuleKey[]> {
  // Administradores e owners têm acesso irrestrito a todos os módulos disponíveis
  if (isAdmin) {
    return Object.keys(SYSTEM_MODULES) as ModuleKey[];
  }

  return remember(
    `org:${organizationId}:user:${userId}:modules`,
    120,
    async () => {
      const departments = await listDepartments(organizationId);
      const userDepartments = departments.filter((dept) =>
        dept.members.some((m) => m.person?.userId === userId),
      );

      const activeKeys = new Set<ModuleKey>();
      for (const dept of userDepartments) {
        if (dept.modules) {
          for (const mod of dept.modules) {
            activeKeys.add(mod.moduleKey as ModuleKey);
          }
        }
      }

      return Array.from(activeKeys);
    },
    [`departments:${organizationId}`, `modules:${organizationId}`],
  );
}

/**
 * Verifica se um módulo específico está liberado para o usuário.
 */
export async function isModuleActiveForUser(
  organizationId: string,
  userId: string,
  moduleKey: ModuleKey,
  isAdmin: boolean,
): Promise<boolean> {
  if (isAdmin) {
    return true;
  }
  const accessibleKeys = await getUserAccessibleModuleKeys(
    organizationId,
    userId,
    isAdmin,
  );
  return accessibleKeys.includes(moduleKey);
}
