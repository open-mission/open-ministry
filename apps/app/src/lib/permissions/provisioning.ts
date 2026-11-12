import { db } from "@/db";
import * as schema from "@/db/schema";
import { MODULE_KEYS, type ModuleKey } from "./catalog";
import {
  buildDefaultOrganizationPermissionRows,
  type OrganizationRolePermissionSeedRow,
} from "./defaults";

export type OrganizationModuleSeedRow = {
  organizationId: string;
  moduleKey: ModuleKey;
  enabled: boolean;
};

export type DepartmentModuleSeedRow = {
  departmentId: string;
  moduleKey: ModuleKey;
};

/**
 * Módulos iniciais comuns ativados por padrão em todos os departamentos.
 * Música ("music") é estritamente opt-in e não deve ser incluída nesta lista.
 */
export const COMMON_DEPARTMENT_MODULES: readonly ModuleKey[] = [
  "agenda",
  "schedules",
  "announcements",
  "tasks",
] as const;

/**
 * Constrói linhas puras de disponibilidade global de módulos para uma organização.
 */
export function buildOrganizationModuleRows(
  organizationId: string,
): OrganizationModuleSeedRow[] {
  return MODULE_KEYS.map((moduleKey) => ({
    organizationId,
    moduleKey,
    enabled: true,
  }));
}

/**
 * Constrói linhas puras de ativação departamental padrão.
 * Contém apenas agenda, schedules e announcements.
 */
export function buildDepartmentModuleRows(
  _organizationId: string,
  departmentId: string,
): DepartmentModuleSeedRow[] {
  return COMMON_DEPARTMENT_MODULES.map((moduleKey) => ({
    departmentId,
    moduleKey,
  }));
}

/**
 * Realiza o provisionamento idempotente dos módulos e permissões da organização.
 */
export async function seedOrganizationPermissions(
  organizationId: string,
): Promise<void> {
  // 1. Módulos da organização
  const moduleRows = buildOrganizationModuleRows(organizationId).map(
    (row) => ({
      id: crypto.randomUUID(),
      organizationId: row.organizationId,
      moduleKey: row.moduleKey,
      enabled: row.enabled,
    }),
  );

  await db
    .insert(schema.organizationModule)
    .values(moduleRows)
    .onConflictDoNothing({
      target: [
        schema.organizationModule.organizationId,
        schema.organizationModule.moduleKey,
      ],
    });

  // 2. Políticas padrão por papel
  const permissionRows = buildDefaultOrganizationPermissionRows(
    organizationId,
  ).map((row: OrganizationRolePermissionSeedRow) => ({
    id: crypto.randomUUID(),
    organizationId: row.organizationId,
    role: row.role,
    moduleKey: row.moduleKey,
    action: row.action,
    enabled: row.enabled,
  }));

  await db
    .insert(schema.organizationRolePermission)
    .values(permissionRows)
    .onConflictDoNothing({
      target: [
        schema.organizationRolePermission.organizationId,
        schema.organizationRolePermission.role,
        schema.organizationRolePermission.moduleKey,
        schema.organizationRolePermission.action,
      ],
    });
}

/**
 * Realiza o provisionamento idempotente dos módulos padrão em um departamento.
 */
export async function seedDepartmentModules(
  organizationId: string,
  departmentId: string,
): Promise<void> {
  const deptRows = buildDepartmentModuleRows(organizationId, departmentId).map(
    (row) => ({
      id: crypto.randomUUID(),
      departmentId: row.departmentId,
      moduleKey: row.moduleKey,
    }),
  );

  await db
    .insert(schema.departmentModule)
    .values(deptRows)
    .onConflictDoNothing({
      target: [
        schema.departmentModule.departmentId,
        schema.departmentModule.moduleKey,
      ],
    });
}
