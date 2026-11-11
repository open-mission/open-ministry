import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import {
  requireOrganizationContext,
  type OrganizationContext,
} from "@/lib/organizations";
import { SYSTEM_MODULES } from "@/lib/modules/registry";
import {
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

type DepartmentPermissionMeta = {
  id: string;
  organizationId: string;
  moduleKeys: string[];
};

type OrganizationPermissionBundle = {
  policy: FullPermissionPolicy;
  enabledModules: string[];
  departments: DepartmentPermissionMeta[];
};

type UserPermissionMembership = {
  departmentId: string;
  departmentOrganizationId: string;
  isLeader: boolean;
  moduleKeys: string[];
};

type UserPermissionGrant = {
  departmentId: string;
  moduleKey: string;
  action: string;
};

type UserPermissionBundle = {
  personId: string | null;
  memberships: UserPermissionMembership[];
  grants: UserPermissionGrant[];
};

type PermissionData = {
  context: OrganizationContext;
  organizationBundle: OrganizationPermissionBundle;
  userBundle: UserPermissionBundle;
  departmentsById: Map<string, DepartmentPermissionMeta>;
  membershipsByDepartment: Map<string, UserPermissionMembership>;
  grants: Set<string>;
};

function grantKey(departmentId: string, moduleKey: string, action: string) {
  return `${departmentId}:${moduleKey}:${action}`;
}

/**
 * Carrega tudo que muda pouco e é necessário para autorizar um usuário:
 * módulos da igreja, política de papéis e módulos ativos por departamento.
 * Fica em cache por 2 minutos para não repetir essas consultas em cada render.
 */
async function loadOrganizationPermissionBundle(
  organizationId: string,
): Promise<OrganizationPermissionBundle> {
  return remember(
    `org:${organizationId}:permissions-bundle`,
    120,
    async () => {
      let moduleRows: (typeof schema.organizationModule.$inferSelect)[] = [];

      try {
        moduleRows = await db.query.organizationModule.findMany({
          where: eq(
            schema.organizationModule.organizationId,
            organizationId,
          ),
        });
      } catch (error) {
        console.warn(
          "[permissions] Falha ao consultar organization_module; usando padrão:",
          error,
        );
      }

      let policyRows: (typeof schema.organizationRolePermission.$inferSelect)[] =
        [];

      try {
        policyRows = await db.query.organizationRolePermission.findMany({
          where: eq(
            schema.organizationRolePermission.organizationId,
            organizationId,
          ),
        });
      } catch (error) {
        console.warn(
          "[permissions] Falha ao consultar organization_role_permission; usando defaults:",
          error,
        );
      }

      const departments = await db.query.department.findMany({
        where: eq(schema.department.organizationId, organizationId),
        columns: { id: true, organizationId: true },
        with: {
          modules: {
            columns: { moduleKey: true },
          },
        },
      });

      const moduleState = new Map(
        moduleRows.map((row) => [row.moduleKey, row.enabled]),
      );
      // Preserve the previous fallback: a module without a row is treated as
      // enabled, while an explicit disabled row wins.
      const enabledModules = (Object.keys(SYSTEM_MODULES) as ModuleKey[]).filter(
        (key) => moduleState.get(key) ?? true,
      );

      // Clona os defaults e aplica as sobrescritas gravadas no banco.
      const policy: FullPermissionPolicy = JSON.parse(
        JSON.stringify(DEFAULT_PERMISSION_POLICY),
      );

      for (const row of policyRows) {
        const role = row.role as "admin" | "leader" | "member";
        const mod = row.moduleKey as ModuleKey;
        const action = row.action;

        if (policy[role]?.[mod] && action in policy[role][mod]) {
          (policy[role][mod] as Record<string, boolean>)[action] = row.enabled;
        }
      }

      return {
        policy,
        enabledModules,
        departments: departments.map((department) => ({
          id: department.id,
          organizationId: department.organizationId,
          moduleKeys: department.modules.map((mod) => mod.moduleKey),
        })),
      };
    },
    [
      `permissions:${organizationId}`,
      `modules:${organizationId}`,
      `departments:${organizationId}`,
    ],
  );
}

/**
 * Carrega em uma única entrada de cache a persona do usuário, seus vínculos
 * com departamentos e os grants ativos. Antes, cada checagem de permissão
 * repetia essas consultas.
 */
async function loadUserPermissionBundle(
  organizationId: string,
  userId: string,
): Promise<UserPermissionBundle> {
  return remember(
    `org:${organizationId}:user:${userId}:permissions-bundle`,
    120,
    async () => {
      const [person, grants] = await Promise.all([
        db.query.person.findFirst({
          where: and(
            eq(schema.person.organizationId, organizationId),
            eq(schema.person.userId, userId),
          ),
          columns: { id: true },
        }),
        db.query.departmentPermissionGrant.findMany({
          where: and(
            eq(
              schema.departmentPermissionGrant.organizationId,
              organizationId,
            ),
            eq(schema.departmentPermissionGrant.granteeUserId, userId),
            isNull(schema.departmentPermissionGrant.revokedAt),
          ),
          columns: {
            departmentId: true,
            moduleKey: true,
            action: true,
          },
        }),
      ]);

      const memberships = person
        ? await db.query.departmentMember.findMany({
            where: eq(schema.departmentMember.personId, person.id),
            columns: { departmentId: true, isLeader: true },
            with: {
              department: {
                columns: { id: true, organizationId: true },
                with: {
                  modules: {
                    columns: { moduleKey: true },
                  },
                },
              },
            },
          })
        : [];

      return {
        personId: person?.id ?? null,
        memberships: memberships.map((membership) => ({
          departmentId: membership.departmentId,
          departmentOrganizationId: membership.department.organizationId,
          isLeader: membership.isLeader,
          moduleKeys: membership.department.modules.map(
            (mod) => mod.moduleKey,
          ),
        })),
        grants: grants.map((grant) => ({
          departmentId: grant.departmentId,
          moduleKey: grant.moduleKey,
          action: grant.action,
        })),
      };
    },
    [
      `permissions:${organizationId}`,
      `people:${organizationId}`,
      `departments:${organizationId}`,
    ],
  );
}

/**
 * Deduplica dentro da mesma requisição: a página de evento chama `can` várias
 * vezes para o mesmo evento (editar, excluir, editar cronograma).
 */
const getEventDepartmentIds = cache(
  async (organizationId: string, eventId: string): Promise<string[] | null> => {
    const event = await db.query.event.findFirst({
      where: and(
        eq(schema.event.id, eventId),
        eq(schema.event.organizationId, organizationId),
      ),
      columns: { id: true },
      with: {
        departments: {
          columns: { departmentId: true },
        },
      },
    });

    if (!event) {
      return null;
    }

    return event.departments.map((department) => department.departmentId);
  },
);

const getTargetPersonDepartmentIds = cache(
  async (
    organizationId: string,
    personId: string,
  ): Promise<string[] | null> => {
    const person = await db.query.person.findFirst({
      where: and(
        eq(schema.person.id, personId),
        eq(schema.person.organizationId, organizationId),
      ),
      columns: { id: true },
    });

    if (!person) {
      return null;
    }

    const memberships = await db.query.departmentMember.findMany({
      where: eq(schema.departmentMember.personId, person.id),
      columns: { departmentId: true },
    });

    return memberships.map((membership) => membership.departmentId);
  },
);

async function loadPermissionData(
  context: OrganizationContext,
): Promise<PermissionData> {
  const [organizationBundle, userBundle] = await Promise.all([
    loadOrganizationPermissionBundle(context.organization.id),
    loadUserPermissionBundle(
      context.organization.id,
      context.session.user.id,
    ),
  ]);

  return {
    context,
    organizationBundle,
    userBundle,
    departmentsById: new Map(
      organizationBundle.departments.map((department) => [
        department.id,
        department,
      ]),
    ),
    membershipsByDepartment: new Map(
      userBundle.memberships.map((membership) => [
        membership.departmentId,
        membership,
      ]),
    ),
    grants: new Set(
      userBundle.grants.map((grant) =>
        grantKey(grant.departmentId, grant.moduleKey, grant.action),
      ),
    ),
  };
}

function buildDepartmentSnapshot(
  data: PermissionData,
  departmentId: string,
  moduleKey: ModuleKey,
  action: PermissionAction,
): DepartmentSnapshot {
  const department = data.departmentsById.get(departmentId);
  const membership = data.membershipsByDepartment.get(departmentId);

  return {
    departmentId,
    departmentBelongsToOrganization: Boolean(department),
    isModuleActiveInDepartment:
      department?.moduleKeys.includes(moduleKey) ?? false,
    isUserMember: Boolean(membership),
    isUserLeader: membership?.isLeader ?? false,
    hasActiveGrant: data.grants.has(
      grantKey(departmentId, moduleKey, action),
    ),
  };
}

function buildEventSnapshot(
  data: PermissionData,
  departmentIds: string[],
  moduleKey: ModuleKey,
  action: PermissionAction,
): EventSnapshot {
  return {
    eventBelongsToOrganization: true,
    departmentIds,
    departments: departmentIds.map((departmentId) =>
      buildDepartmentSnapshot(data, departmentId, moduleKey, action),
    ),
  };
}

function buildSnapshot(
  data: PermissionData,
  moduleKey: ModuleKey,
  action: PermissionAction,
  scope: PermissionScope | undefined,
  eventDepartmentIds?: string[] | null,
): PermissionSnapshot {
  const userHasAnyActiveDepartmentForModule =
    data.userBundle.memberships.some(
      (membership) =>
        membership.departmentOrganizationId ===
          data.context.organization.id &&
        membership.moduleKeys.includes(moduleKey),
    );

  const userHasActiveLedMusicDepartment =
    data.userBundle.memberships.some(
      (membership) =>
        membership.departmentOrganizationId ===
          data.context.organization.id &&
        membership.isLeader &&
        membership.moduleKeys.includes("music"),
    );

  return {
    moduleKey,
    action,
    isOrganizationModuleEnabled:
      data.organizationBundle.enabledModules.includes(moduleKey),
    userRole: data.context.isAdmin ? "admin" : "member",
    userId: data.context.session.user.id,
    userPersonId: data.userBundle.personId,
    policy: data.organizationBundle.policy,
    scope,
    departmentContext: scope?.departmentId
      ? buildDepartmentSnapshot(
          data,
          scope.departmentId,
          moduleKey,
          action,
        )
      : null,
    eventContext:
      eventDepartmentIds === undefined
        ? null
        : eventDepartmentIds === null
          ? {
              eventBelongsToOrganization: false,
              departmentIds: [],
              departments: [],
            }
          : buildEventSnapshot(
              data,
              eventDepartmentIds,
              moduleKey,
              action,
            ),
    userHasActiveLedMusicDepartment,
    userHasAnyActiveDepartmentForModule,
  };
}

async function evaluateCan(
  moduleKey: ModuleKey,
  action: PermissionAction,
  scope?: PermissionScope,
  contextOverride?: OrganizationContext,
): Promise<boolean> {
  const context = contextOverride ?? (await requireOrganizationContext());
  const data = await loadPermissionData(context);

  const eventDepartmentIds = scope?.eventId
    ? await getEventDepartmentIds(
        context.organization.id,
        scope.eventId,
      )
    : undefined;

  const snapshot = buildSnapshot(
    data,
    moduleKey,
    action,
    scope,
    eventDepartmentIds,
  );

  // Escopo por pessoa (ex.: avisos individuais): resolve os departamentos da
  // pessoa-alvo sem consultar o banco dentro do loop de departamentos.
  if (!snapshot.departmentContext && scope?.targetPersonId) {
    const targetDepartmentIds = await getTargetPersonDepartmentIds(
      context.organization.id,
      scope.targetPersonId,
    );

    if (targetDepartmentIds === null) {
      snapshot.departmentContext = {
        departmentId: "unknown",
        departmentBelongsToOrganization: false,
        isModuleActiveInDepartment: false,
        isUserMember: false,
        isUserLeader: false,
        hasActiveGrant: false,
      };
    } else if (context.isAdmin) {
      snapshot.departmentContext = {
        departmentId: "church-wide",
        departmentBelongsToOrganization: true,
        isModuleActiveInDepartment: true,
        isUserMember: true,
        isUserLeader: true,
        hasActiveGrant: false,
      };
    } else if (data.userBundle.personId) {
      for (const departmentId of targetDepartmentIds) {
        const department = data.departmentsById.get(departmentId);

        if (!department || !department.moduleKeys.includes(moduleKey)) {
          continue;
        }

        const membership =
          data.membershipsByDepartment.get(departmentId);
        const hasActiveGrant = data.grants.has(
          grantKey(departmentId, moduleKey, action),
        );

        if (membership?.isLeader || hasActiveGrant) {
          snapshot.departmentContext = {
            departmentId,
            departmentBelongsToOrganization: true,
            isModuleActiveInDepartment: true,
            isUserMember: Boolean(membership),
            isUserLeader: Boolean(membership?.isLeader),
            hasActiveGrant,
          };
          break;
        }
      }
    }
  }

  return evaluatePermission(snapshot);
}

/**
 * Deduplica chamadas idênticas durante o mesmo render. É seguro porque o
 * resultado é sempre derivado dos bundles cacheados acima.
 */
const canForRequest = cache(
  (
    moduleKey: ModuleKey,
    action: PermissionAction,
    scopeKey: string,
  ): Promise<boolean> =>
    evaluateCan(
      moduleKey,
      action,
      scopeKey ? (JSON.parse(scopeKey) as PermissionScope) : undefined,
    ),
);

/**
 * Verifica se o usuário atual pode executar uma ação.
 *
 * O contexto e os dados de permissão são cacheados por requisição (e por alguns
 * minutos entre requisições), então chamadas repetidas na mesma página não
 * geram novas consultas ao banco.
 */
export async function can(
  moduleKey: ModuleKey,
  action: PermissionAction,
  scope?: PermissionScope,
  contextOverride?: OrganizationContext,
): Promise<boolean> {
  if (contextOverride) {
    return evaluateCan(moduleKey, action, scope, contextOverride);
  }

  return canForRequest(
    moduleKey,
    action,
    scope ? JSON.stringify(scope) : "",
  );
}

/**
 * Verifica se o usuário pode executar a ação em pelo menos um dos
 * departamentos informados. Evita o padrão `Promise.all(departments.map(can))`
 * que disparava dezenas de consultas na página de agenda.
 */
export async function canAnyDepartment(
  moduleKey: ModuleKey,
  action: PermissionAction,
  departmentIds: string[],
  contextOverride?: OrganizationContext,
): Promise<boolean> {
  if (departmentIds.length === 0) {
    return false;
  }

  const context = contextOverride ?? (await requireOrganizationContext());
  const data = await loadPermissionData(context);

  return departmentIds.some((departmentId) =>
    evaluatePermission(
      buildSnapshot(data, moduleKey, action, { departmentId }),
    ),
  );
}

/**
 * Carrega a política de permissões configurada para a organização.
 * Se uma ação/papel não estiver no banco, utiliza os defaults do sistema.
 */
export async function loadOrganizationPolicy(
  organizationId: string,
): Promise<FullPermissionPolicy> {
  const bundle = await loadOrganizationPermissionBundle(organizationId);
  return bundle.policy;
}

/**
 * Verifica se um módulo está globalmente habilitado para a organização.
 */
export async function isOrganizationModuleEnabled(
  organizationId: string,
  moduleKey: ModuleKey,
): Promise<boolean> {
  const bundle = await loadOrganizationPermissionBundle(organizationId);
  return bundle.enabledModules.includes(moduleKey);
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
