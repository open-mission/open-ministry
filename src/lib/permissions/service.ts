import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireOrganizationContext, type OrganizationContext } from "@/lib/organizations";
import {
  MODULE_KEYS,
  type ModuleKey,
  type PermissionAction,
} from "./catalog";
import {
  DEFAULT_PERMISSION_POLICY,
  type FullPermissionPolicy,
} from "./defaults";
import {
  evaluatePermission,
  type DepartmentSnapshot,
  type EventSnapshot,
  type PermissionScope,
  type PermissionSnapshot,
} from "./evaluator";

export class PermissionDeniedError extends Error {
  constructor(message = "Você não tem permissão para realizar esta ação.") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Carrega a política de permissões configurada para a organização.
 * Se uma ação/papel não estiver no banco, utiliza os defaults do sistema.
 */
export async function loadOrganizationPolicy(
  organizationId: string,
): Promise<FullPermissionPolicy> {
  const rows = await db.query.organizationRolePermission.findMany({
    where: eq(schema.organizationRolePermission.organizationId, organizationId),
  });

  // Clona os defaults
  const policy: FullPermissionPolicy = JSON.parse(
    JSON.stringify(DEFAULT_PERMISSION_POLICY),
  );

  for (const row of rows) {
    const role = row.role as "admin" | "leader" | "member";
    const mod = row.moduleKey as ModuleKey;
    const action = row.action;

    if (policy[role]?.[mod] && action in policy[role][mod]) {
      (policy[role][mod] as Record<string, boolean>)[action] = row.enabled;
    }
  }

  return policy;
}

/**
 * Verifica se um módulo está globalmente habilitado para a organização.
 */
export async function isOrganizationModuleEnabled(
  organizationId: string,
  moduleKey: ModuleKey,
): Promise<boolean> {
  const row = await db.query.organizationModule.findFirst({
    where: and(
      eq(schema.organizationModule.organizationId, organizationId),
      eq(schema.organizationModule.moduleKey, moduleKey),
    ),
  });

  // Se a linha ainda não existir (banco sem seed inicial), assume habilitado para os 4 módulos iniciais
  if (!row) {
    return (MODULE_KEYS as readonly string[]).includes(moduleKey);
  }

  return row.enabled;
}

/**
 * Avaliador central de autorização no servidor.
 * Resolve identidade, igreja e contexto Better Auth no servidor de forma segura.
 * Nunca confia em dados de cliente.
 */
export async function can(
  moduleKey: ModuleKey,
  action: PermissionAction,
  scope?: PermissionScope,
  contextOverride?: OrganizationContext,
): Promise<boolean> {
  const context = contextOverride ?? (await requireOrganizationContext());
  const organizationId = context.organization.id;
  const userId = context.session.user.id;
  const isAdmin = context.isAdmin;

  // 1. Disponibilidade global do módulo para a igreja
  const isOrgModuleEnabled = await isOrganizationModuleEnabled(
    organizationId,
    moduleKey,
  );
  if (!isOrgModuleEnabled) {
    return false;
  }

  // 2. Resolver a personId do usuário na igreja ativa
  const userPerson = await db.query.person.findFirst({
    where: and(
      eq(schema.person.organizationId, organizationId),
      eq(schema.person.userId, userId),
    ),
  });
  const userPersonId = userPerson?.id ?? null;

  // 3. Carregar política de permissões atual da organização
  const policy = await loadOrganizationPolicy(organizationId);

  // 4. Resolver contexto de departamento se scope.departmentId foi informado
  let departmentContext: DepartmentSnapshot | null = null;
  if (scope?.departmentId) {
    const dept = await db.query.department.findFirst({
      where: and(
        eq(schema.department.id, scope.departmentId),
        eq(schema.department.organizationId, organizationId),
      ),
    });

    if (!dept) {
      departmentContext = {
        departmentId: scope.departmentId,
        departmentBelongsToOrganization: false,
        isModuleActiveInDepartment: false,
        isUserMember: false,
        isUserLeader: false,
        hasActiveGrant: false,
      };
    } else {
      const activeModule = await db.query.departmentModule.findFirst({
        where: and(
          eq(schema.departmentModule.departmentId, dept.id),
          eq(schema.departmentModule.moduleKey, moduleKey),
        ),
      });

      let isUserMember = false;
      let isUserLeader = false;

      if (userPersonId) {
        const membership = await db.query.departmentMember.findFirst({
          where: and(
            eq(schema.departmentMember.departmentId, dept.id),
            eq(schema.departmentMember.personId, userPersonId),
          ),
        });
        if (membership) {
          isUserMember = true;
          isUserLeader = membership.isLeader;
        }
      }

      // Consulta de grant ativo
      const activeGrant = await db.query.departmentPermissionGrant.findFirst({
        where: and(
          eq(schema.departmentPermissionGrant.organizationId, organizationId),
          eq(schema.departmentPermissionGrant.departmentId, dept.id),
          eq(schema.departmentPermissionGrant.granteeUserId, userId),
          eq(schema.departmentPermissionGrant.moduleKey, moduleKey),
          eq(schema.departmentPermissionGrant.action, action),
          isNull(schema.departmentPermissionGrant.revokedAt),
        ),
      });

      departmentContext = {
        departmentId: dept.id,
        departmentBelongsToOrganization: true,
        isModuleActiveInDepartment: Boolean(activeModule),
        isUserMember,
        isUserLeader,
        hasActiveGrant: Boolean(activeGrant),
      };
    }
  }

  // 5. Resolver contexto de evento se scope.eventId foi informado
  let eventContext: EventSnapshot | null = null;
  if (scope?.eventId) {
    const ev = await db.query.event.findFirst({
      where: and(
        eq(schema.event.id, scope.eventId),
        eq(schema.event.organizationId, organizationId),
      ),
    });

    if (!ev) {
      eventContext = {
        eventBelongsToOrganization: false,
        departmentIds: [],
        departments: [],
      };
    } else {
      const eventDepts = await db.query.eventDepartment.findMany({
        where: eq(schema.eventDepartment.eventId, ev.id),
      });

      const departmentSnapshots: DepartmentSnapshot[] = [];
      for (const ed of eventDepts) {
        const activeModule = await db.query.departmentModule.findFirst({
          where: and(
            eq(schema.departmentModule.departmentId, ed.departmentId),
            eq(schema.departmentModule.moduleKey, moduleKey),
          ),
        });

        let isUserMember = false;
        let isUserLeader = false;

        if (userPersonId) {
          const membership = await db.query.departmentMember.findFirst({
            where: and(
              eq(schema.departmentMember.departmentId, ed.departmentId),
              eq(schema.departmentMember.personId, userPersonId),
            ),
          });
          if (membership) {
            isUserMember = true;
            isUserLeader = membership.isLeader;
          }
        }

        const activeGrant =
          await db.query.departmentPermissionGrant.findFirst({
            where: and(
              eq(
                schema.departmentPermissionGrant.organizationId,
                organizationId,
              ),
              eq(
                schema.departmentPermissionGrant.departmentId,
                ed.departmentId,
              ),
              eq(schema.departmentPermissionGrant.granteeUserId, userId),
              eq(schema.departmentPermissionGrant.moduleKey, moduleKey),
              eq(schema.departmentPermissionGrant.action, action),
              isNull(schema.departmentPermissionGrant.revokedAt),
            ),
          });

        departmentSnapshots.push({
          departmentId: ed.departmentId,
          departmentBelongsToOrganization: true,
          isModuleActiveInDepartment: Boolean(activeModule),
          isUserMember,
          isUserLeader,
          hasActiveGrant: Boolean(activeGrant),
        });
      }

      eventContext = {
        eventBelongsToOrganization: true,
        departmentIds: eventDepts.map((d) => d.departmentId),
        departments: departmentSnapshots,
      };
    }
  }

  // 6. Verificar se o usuário lidera algum departamento com Música ativa (para music.createSong)
  let userHasActiveLedMusicDepartment = false;
  if (moduleKey === "music" && action === "createSong" && !isAdmin && userPersonId) {
    const ledMemberships = await db.query.departmentMember.findMany({
      where: and(
        eq(schema.departmentMember.personId, userPersonId),
        eq(schema.departmentMember.isLeader, true),
      ),
      with: {
        department: {
          with: {
            modules: true,
          },
        },
      },
    });

    userHasActiveLedMusicDepartment = ledMemberships.some(
      (m) =>
        m.department.organizationId === organizationId &&
        m.department.modules.some((mod) => mod.moduleKey === "music"),
    );
  }

  // 7. Para leitura geral sem escopo: verificar se pertence a ao menos um departamento com módulo ativo
  let userHasAnyActiveDepartmentForModule = false;
  if (!isAdmin && userPersonId) {
    if (moduleKey === "music") {
      // Música é organizacional; leitura é permitida a membros gerais
      userHasAnyActiveDepartmentForModule = true;
    } else {
      const userMemberships = await db.query.departmentMember.findMany({
        where: eq(schema.departmentMember.personId, userPersonId),
        with: {
          department: {
            with: {
              modules: true,
            },
          },
        },
      });

      userHasAnyActiveDepartmentForModule = userMemberships.some(
        (m) =>
          m.department.organizationId === organizationId &&
          m.department.modules.some((mod) => mod.moduleKey === moduleKey),
      );
    }
  }

  const snapshot: PermissionSnapshot = {
    moduleKey,
    action,
    isOrganizationModuleEnabled: isOrgModuleEnabled,
    userRole: isAdmin ? "admin" : "member",
    userId,
    userPersonId,
    policy,
    scope,
    departmentContext,
    eventContext,
    userHasActiveLedMusicDepartment,
    userHasAnyActiveDepartmentForModule,
  };

  return evaluatePermission(snapshot);
}

/**
 * Exige permissão no servidor; lança PermissionDeniedError se negado.
 */
export async function requirePermission(
  moduleKey: ModuleKey,
  action: PermissionAction,
  scope?: PermissionScope,
  contextOverride?: OrganizationContext,
): Promise<void> {
  const allowed = await can(moduleKey, action, scope, contextOverride);
  if (!allowed) {
    throw new PermissionDeniedError();
  }
}
