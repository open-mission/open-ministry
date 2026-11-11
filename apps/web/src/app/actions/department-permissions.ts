"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags } from "@/lib/cache";
import { getDepartmentAccess } from "@/lib/departments";
import { requireOrganizationContext } from "@/lib/organizations";
import {
  isActionDelegable,
  isValidModule,
  isValidModuleAction,
  type ModuleKey,
} from "@/lib/permissions/catalog";

export type DepartmentGrantResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type GrantDepartmentPermissionInput = {
  departmentId: string;
  userId: string;
  moduleKey: ModuleKey;
  action: string;
};

export type RevokeDepartmentPermissionInput = {
  grantId: string;
};

export type DepartmentGrantViewItem = {
  id: string;
  departmentId: string;
  granteeUserId: string;
  granteeName: string;
  granteeEmail: string;
  moduleKey: ModuleKey;
  action: string;
  grantedByUserId: string;
  grantedByName: string;
  createdAt: Date;
};

/**
 * Concede uma permissão departamental aditiva a um membro do departamento.
 * Concessões só são válidas para ações marcadas como delegáveis e para membros do departamento.
 */
export async function grantDepartmentPermissionAction({
  departmentId,
  userId,
  moduleKey,
  action,
}: GrantDepartmentPermissionInput): Promise<
  DepartmentGrantResult<{ id: string }>
> {
  if (!isValidModule(moduleKey)) {
    return { ok: false, error: "Módulo inválido." };
  }

  if (!isValidModuleAction(moduleKey, action)) {
    return { ok: false, error: "Ação inválida para o módulo." };
  }

  if (!isActionDelegable(moduleKey, action)) {
    return {
      ok: false,
      error: "Esta ação não é delegável individualmente.",
    };
  }

  const context = await requireOrganizationContext();
  const orgId = context.organization.id;

  // Verifica se o concedente tem acesso de gestão ao departamento
  const access = await getDepartmentAccess(
    orgId,
    departmentId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!access || !access.canManage) {
    return {
      ok: false,
      error: "Você não tem permissão para gerenciar permissões deste departamento.",
    };
  }

  // Valida se o alvo pertence à igreja
  const targetPerson = await db.query.person.findFirst({
    where: and(
      eq(schema.person.userId, userId),
      eq(schema.person.organizationId, orgId),
    ),
  });

  if (!targetPerson) {
    return {
      ok: false,
      error: "Usuário alvo não encontrado na igreja ativa.",
    };
  }

  // Valida se o alvo é membro deste departamento
  const targetMembership = await db.query.departmentMember.findFirst({
    where: and(
      eq(schema.departmentMember.departmentId, departmentId),
      eq(schema.departmentMember.personId, targetPerson.id),
    ),
  });

  if (!targetMembership) {
    return {
      ok: false,
      error: "A pessoa precisa ser membro deste departamento para receber concessões.",
    };
  }

  const grantId = crypto.randomUUID();

  await db
    .insert(schema.departmentPermissionGrant)
    .values({
      id: grantId,
      organizationId: orgId,
      departmentId,
      granteeUserId: userId,
      moduleKey,
      action,
      grantedByUserId: context.session.user.id,
    })
    .onConflictDoNothing();

  await cacheInvalidateTags(
    `permissions:${orgId}`,
    `departments:${orgId}`,
    `department:${departmentId}`,
  );

  revalidatePath(`/dashboard/departments/${departmentId}`);

  return { ok: true, data: { id: grantId } };
}

/**
 * Revoga uma permissão departamental concedida anteriormente.
 * A revogação tem efeito imediato e mantém o histórico auditável no banco.
 */
export async function revokeDepartmentPermissionAction({
  grantId,
}: RevokeDepartmentPermissionInput): Promise<DepartmentGrantResult> {
  const context = await requireOrganizationContext();
  const orgId = context.organization.id;

  const grant = await db.query.departmentPermissionGrant.findFirst({
    where: and(
      eq(schema.departmentPermissionGrant.id, grantId),
      eq(schema.departmentPermissionGrant.organizationId, orgId),
      isNull(schema.departmentPermissionGrant.revokedAt),
    ),
  });

  if (!grant) {
    return {
      ok: false,
      error: "Concessão de permissão não encontrada ou já revogada.",
    };
  }

  const access = await getDepartmentAccess(
    orgId,
    grant.departmentId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!access || !access.canManage) {
    return {
      ok: false,
      error: "Você não tem permissão para revogar permissões deste departamento.",
    };
  }

  await db
    .update(schema.departmentPermissionGrant)
    .set({
      revokedAt: new Date(),
      revokedByUserId: context.session.user.id,
    })
    .where(eq(schema.departmentPermissionGrant.id, grant.id));

  await cacheInvalidateTags(
    `permissions:${orgId}`,
    `departments:${orgId}`,
    `department:${grant.departmentId}`,
  );

  revalidatePath(`/dashboard/departments/${grant.departmentId}`);

  return { ok: true, data: undefined };
}

/**
 * Lista as concessões ativas de um departamento para exibição na interface administrativa.
 */
export async function listDepartmentGrantsAction(
  departmentId: string,
): Promise<DepartmentGrantResult<DepartmentGrantViewItem[]>> {
  const context = await requireOrganizationContext();
  const orgId = context.organization.id;

  const access = await getDepartmentAccess(
    orgId,
    departmentId,
    context.session.user.id,
    context.isAdmin,
  );

  if (!access || !access.canManage) {
    return {
      ok: false,
      error: "Você não tem permissão para visualizar concessões deste departamento.",
    };
  }

  const rows = await db.query.departmentPermissionGrant.findMany({
    where: and(
      eq(schema.departmentPermissionGrant.organizationId, orgId),
      eq(schema.departmentPermissionGrant.departmentId, departmentId),
      isNull(schema.departmentPermissionGrant.revokedAt),
    ),
    with: {
      granteeUser: true,
      grantedByUser: true,
    },
  });

  const items: DepartmentGrantViewItem[] = rows.map((r) => ({
    id: r.id,
    departmentId: r.departmentId,
    granteeUserId: r.granteeUserId,
    granteeName: r.granteeUser?.name ?? "Membro",
    granteeEmail: r.granteeUser?.email ?? "",
    moduleKey: r.moduleKey as ModuleKey,
    action: r.action,
    grantedByUserId: r.grantedByUserId,
    grantedByName: r.grantedByUser?.name ?? "Líder",
    createdAt: r.createdAt,
  }));

  return { ok: true, data: items };
}
