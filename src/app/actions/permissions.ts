"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  isValidModule,
  isValidModuleAction,
  MODULE_KEYS,
  type ModuleKey,
  type PermissionRole,
} from "@/lib/permissions/catalog";
import {
  DEFAULT_PERMISSION_POLICY,
  type FullPermissionPolicy,
} from "@/lib/permissions/defaults";
import { loadOrganizationPolicy } from "@/lib/permissions/service";

export type PermissionActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type OrganizationModuleSetting = {
  moduleKey: ModuleKey;
  enabled: boolean;
};

export type OrganizationPermissionSettingsData = {
  modules: OrganizationModuleSetting[];
  policy: FullPermissionPolicy;
};

/**
 * Retorna as configurações de disponibilidade de módulos e permissões de papéis para a igreja.
 * Apenas administradores podem acessar a política global.
 */
export async function getOrganizationPermissionSettingsAction(): Promise<
  PermissionActionResult<OrganizationPermissionSettingsData>
> {
  const context = await requireOrganizationContext();
  if (!context.isAdmin) {
    return {
      ok: false,
      error: "Você não tem permissão de administrador para visualizar estas configurações.",
    };
  }

  const orgId = context.organization.id;

  // Carrega disponibilidade dos módulos
  const moduleRows = await db.query.organizationModule.findMany({
    where: eq(schema.organizationModule.organizationId, orgId),
  });

  const modules: OrganizationModuleSetting[] = MODULE_KEYS.map((key) => {
    const row = moduleRows.find((r) => r.moduleKey === key);
    return {
      moduleKey: key,
      enabled: row ? row.enabled : true,
    };
  });

  const policy = await loadOrganizationPolicy(orgId);

  return {
    ok: true,
    data: {
      modules,
      policy,
    },
  };
}

/**
 * Ativa ou desativa um módulo globalmente para a igreja.
 * Apenas administradores.
 */
export async function setOrganizationModuleEnabledAction(
  moduleKey: ModuleKey,
  enabled: boolean,
): Promise<PermissionActionResult> {
  if (!isValidModule(moduleKey)) {
    return { ok: false, error: "Módulo inválido informado." };
  }

  const context = await requireOrganizationContext();
  if (!context.isAdmin) {
    return {
      ok: false,
      error: "Você não tem permissão de administrador para alterar a disponibilidade de módulos.",
    };
  }

  const orgId = context.organization.id;

  await db
    .insert(schema.organizationModule)
    .values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      moduleKey,
      enabled,
    })
    .onConflictDoUpdate({
      target: [
        schema.organizationModule.organizationId,
        schema.organizationModule.moduleKey,
      ],
      set: {
        enabled,
        updatedAt: new Date(),
      },
    });

  await cacheInvalidateTags(
    `permissions:${orgId}`,
    `modules:${orgId}`,
    `departments:${orgId}`,
  );

  return { ok: true, data: undefined };
}

/**
 * Define se uma determinada ação está habilitada para um papel na igreja.
 * Apenas administradores.
 */
export async function setOrganizationRolePermissionAction(
  role: PermissionRole,
  moduleKey: ModuleKey,
  action: string,
  enabled: boolean,
): Promise<PermissionActionResult> {
  if (!["admin", "leader", "member"].includes(role)) {
    return { ok: false, error: "Papel organizacional inválido." };
  }

  if (!isValidModuleAction(moduleKey, action)) {
    return { ok: false, error: "Ação inválida para o módulo especificado." };
  }

  const context = await requireOrganizationContext();
  if (!context.isAdmin) {
    return {
      ok: false,
      error: "Você não tem permissão de administrador para alterar permissões de papéis.",
    };
  }

  const orgId = context.organization.id;

  await db
    .insert(schema.organizationRolePermission)
    .values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      role,
      moduleKey,
      action,
      enabled,
    })
    .onConflictDoUpdate({
      target: [
        schema.organizationRolePermission.organizationId,
        schema.organizationRolePermission.role,
        schema.organizationRolePermission.moduleKey,
        schema.organizationRolePermission.action,
      ],
      set: {
        enabled,
        updatedAt: new Date(),
      },
    });

  await cacheInvalidateTags(`permissions:${orgId}`);

  return { ok: true, data: undefined };
}
