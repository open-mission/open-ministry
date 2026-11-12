import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags, remember } from "@/lib/cache";
import { listDepartments } from "@/lib/departments";
import { SYSTEM_MODULES } from "./registry";
import type { ModuleKey } from "./types";

export {
  buildAccessibleNavGroups,
  buildAccessibleMobileNavItems,
} from "./nav";

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
  return remember(
    `org:${organizationId}:user:${userId}:modules:${isAdmin ? "admin" : "member"}`,
    120,
    async () => {
      // 1. Obter módulos habilitados na organização
      let orgModuleRows: (typeof schema.organizationModule.$inferSelect)[] = [];
      try {
        orgModuleRows = await db.query.organizationModule.findMany({
          where: eq(schema.organizationModule.organizationId, organizationId),
        });
      } catch (error) {
        console.warn(
          "[modules] Falha ao consultar organization_module; assumindo módulos padrão:",
          error,
        );
      }

      // Se não houver registros gravados, assume os 4 iniciais habilitados
      const enabledOrgModules = new Set<ModuleKey>(
        orgModuleRows.length > 0
          ? orgModuleRows
              .filter((r) => r.enabled)
              .map((r) => r.moduleKey as ModuleKey)
          : (Object.keys(SYSTEM_MODULES) as ModuleKey[]),
      );

      if (isAdmin) {
        return Array.from(enabledOrgModules);
      }

      // 2. Para membro comum:
      const departments = await listDepartments(organizationId);
      const userDepartments = departments.filter((dept) =>
        dept.members.some((m) => m.person?.userId === userId),
      );

      const activeKeys = new Set<ModuleKey>();

      // Se Música estiver ativa na igreja, membro tem acesso à leitura
      if (enabledOrgModules.has("music")) {
        activeKeys.add("music");
      }

      // Se Tarefas estiver ativa na igreja, todos os membros têm acesso às suas tarefas pessoais
      if (enabledOrgModules.has("tasks")) {
        activeKeys.add("tasks");
      }

      for (const dept of userDepartments) {
        if (dept.modules) {
          for (const mod of dept.modules) {
            const key = mod.moduleKey as ModuleKey;
            if (enabledOrgModules.has(key)) {
              activeKeys.add(key);
            }
          }
        }
      }

      return Array.from(activeKeys);
    },
    [
      `departments:${organizationId}`,
      `modules:${organizationId}`,
      `permissions:${organizationId}`,
    ],
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
  const accessibleKeys = await getUserAccessibleModuleKeys(
    organizationId,
    userId,
    isAdmin,
  );
  return accessibleKeys.includes(moduleKey);
}
