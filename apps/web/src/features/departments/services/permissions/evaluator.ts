import {
  getActionScope,
  isValidModuleAction,
  type ModuleKey,
  type PermissionRole,
} from "./catalog";
import type { FullPermissionPolicy } from "./defaults";

export function getPolicyActionEnabled(
  policy: FullPermissionPolicy,
  role: PermissionRole,
  moduleKey: ModuleKey,
  action: string,
): boolean {
  const rolePolicy = policy[role]?.[moduleKey] as
    | Record<string, boolean>
    | undefined;
  return rolePolicy?.[action] ?? false;
}

export type PermissionScope = {
  departmentId?: string;
  eventId?: string;
  targetPersonId?: string;
};

export type DepartmentSnapshot = {
  departmentId: string;
  departmentBelongsToOrganization: boolean;
  isModuleActiveInDepartment: boolean;
  isUserMember: boolean;
  isUserLeader: boolean;
  hasActiveGrant: boolean;
};

export type EventSnapshot = {
  eventBelongsToOrganization: boolean;
  departmentIds: string[];
  departments: DepartmentSnapshot[];
};

export type PermissionSnapshot = {
  moduleKey: ModuleKey;
  action: string;
  isOrganizationModuleEnabled: boolean;
  userRole: "admin" | "member";
  userId: string;
  userPersonId?: string | null;
  policy: FullPermissionPolicy;
  scope?: PermissionScope;
  departmentContext?: DepartmentSnapshot | null;
  eventContext?: EventSnapshot | null;
  userHasActiveLedMusicDepartment?: boolean;
  userHasAnyActiveDepartmentForModule?: boolean;
};

export function evaluatePermission(snapshot: PermissionSnapshot): boolean {
  const { moduleKey, action, isOrganizationModuleEnabled, userRole, policy } =
    snapshot;

  // 1. Validar se a ação existe no catálogo para o módulo
  if (!isValidModuleAction(moduleKey, action)) {
    return false;
  }

  // 2. Módulo desativado na igreja é barreira absoluta para uso normal
  if (!isOrganizationModuleEnabled) {
    return false;
  }

  const isAdmin = userRole === "admin";
  const scopeType = getActionScope(moduleKey, action);

  // 3. Caso Administrador
  if (isAdmin) {
    const adminAllowed = getPolicyActionEnabled(
      policy,
      "admin",
      moduleKey,
      action,
    );
    if (!adminAllowed) return false;

    // Se houver escopo departamental explícito, o depto precisa pertencer à igreja e o módulo estar ativo localmente
    if (snapshot.departmentContext) {
      if (!snapshot.departmentContext.departmentBelongsToOrganization) {
        return false;
      }
      if (!snapshot.departmentContext.isModuleActiveInDepartment) {
        return false;
      }
    }

    // Se houver escopo de evento explícito
    if (snapshot.eventContext) {
      if (!snapshot.eventContext.eventBelongsToOrganization) {
        return false;
      }
      // Se o evento tem departamentos associados, o módulo deve estar ativo em pelo menos um deles
      if (
        snapshot.eventContext.departments.length > 0 &&
        !snapshot.eventContext.departments.some(
          (d) => d.isModuleActiveInDepartment,
        )
      ) {
        return false;
      }
    }

    return true;
  }

  // 4. Usuário não-admin (Membro / Líder)
  // Caso especial: autogerenciamento (self) como schedules.manageOwnAvailability
  if (scopeType === "self") {
    if (
      snapshot.scope?.targetPersonId &&
      snapshot.userPersonId &&
      snapshot.scope.targetPersonId !== snapshot.userPersonId
    ) {
      return false;
    }
    return getPolicyActionEnabled(policy, "member", moduleKey, action);
  }

  // Caso especial: Música - cadastro de músicas
  // Exige no servidor um departamento do usuário onde ele é líder e Música está ativa
  if (moduleKey === "music" && action === "createSong") {
    if (!snapshot.userHasActiveLedMusicDepartment) {
      return false;
    }
    return policy.leader.music.createSong ?? false;
  }

  // Caso especial: Outras ações de Música (leitura, edição, exclusão)
  if (moduleKey === "music") {
    return getPolicyActionEnabled(policy, "member", "music", action);
  }

  // Se o escopo for departamental direto (departmentId / departmentContext)
  if (snapshot.departmentContext) {
    const dept = snapshot.departmentContext;

    if (!dept.departmentBelongsToOrganization) {
      return false;
    }
    if (!dept.isModuleActiveInDepartment) {
      return false;
    }

    // Grant ativo concede a ação (desde que seja membro do departamento e o módulo esteja ativo)
    if (dept.hasActiveGrant && dept.isUserMember) {
      return true;
    }

    if (!dept.isUserMember) {
      return false;
    }

    if (dept.isUserLeader) {
      return getPolicyActionEnabled(policy, "leader", moduleKey, action);
    }

    return getPolicyActionEnabled(policy, "member", moduleKey, action);
  }

  // Se o escopo for de evento (eventId / eventContext)
  if (snapshot.eventContext) {
    const eventCtx = snapshot.eventContext;

    if (!eventCtx.eventBelongsToOrganization) {
      return false;
    }

    // Evento sem departamento não herda privilégios de liderança! Usa política de membro
    if (eventCtx.departmentIds.length === 0) {
      return getPolicyActionEnabled(policy, "member", moduleKey, action);
    }

    // Evento com departamentos: verifica se o usuário é líder ou tem grant em ao menos um departamento ativo
    const hasLeaderOrGrantAccess = eventCtx.departments.some(
      (d) =>
        d.isModuleActiveInDepartment &&
        d.isUserMember &&
        ((d.isUserLeader &&
          getPolicyActionEnabled(policy, "leader", moduleKey, action)) ||
          d.hasActiveGrant),
    );

    if (hasLeaderOrGrantAccess) {
      return true;
    }

    // Se é membro em ao menos um departamento ativo do evento, pode usar política de membro
    const isMemberInActiveDept = eventCtx.departments.some(
      (d) => d.isModuleActiveInDepartment && d.isUserMember,
    );

    if (isMemberInActiveDept) {
      return getPolicyActionEnabled(policy, "member", moduleKey, action);
    }

    return false;
  }

  // Sem escopo departamental ou de evento específico (ex: listagem / leitura geral)
  if (action === "read") {
    // Para ler um módulo departamental, o membro precisa pertencer a pelo menos um departamento com o módulo ativo
    if (!snapshot.userHasAnyActiveDepartmentForModule) {
      return false;
    }
    return policy.member[moduleKey]?.read ?? false;
  }

  // Para qualquer outra ação sem escopo departamental
  return getPolicyActionEnabled(policy, "member", moduleKey, action);
}
