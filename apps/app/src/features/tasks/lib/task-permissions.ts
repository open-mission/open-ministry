export type TaskPermissionSubject = {
  scope: string;
  createdById: string;
  assigneeId?: string | null;
  departmentId?: string | null;
  delegationType?: string | null;
};

export type TaskPermissionContext = {
  userId: string;
  isAdmin: boolean;
  ledDepartmentIds?: string[];
  memberDepartmentIds?: string[];
  canCreateOrganization?: boolean;
};

export type TaskCapabilities = {
  canView: boolean;
  canUpdateStatus: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
  canReorder: boolean;
};

/**
 * Resolve as capacidades do usuário sobre uma tarefa específica, garantindo
 * privacidade de tarefas pessoais (nem administradores acessam pessoais de terceiros)
 * e escopo seguro para delegações de departamento e organização.
 */
export function resolveTaskCapabilities(
  task: TaskPermissionSubject,
  ctx: TaskPermissionContext,
): TaskCapabilities {
  const isCreator = task.createdById === ctx.userId;
  const isAssignee = Boolean(task.assigneeId && task.assigneeId === ctx.userId);
  const deptId = task.departmentId ?? null;
  const ledSet = new Set(ctx.ledDepartmentIds ?? []);
  const memberSet = new Set(ctx.memberDepartmentIds ?? []);

  const isDeptLeader = ctx.isAdmin || Boolean(deptId && ledSet.has(deptId));
  const isDeptMember = isDeptLeader || Boolean(deptId && memberSet.has(deptId));

  if (task.scope === "personal") {
    const isOwnerOrAssignee = isCreator || isAssignee;
    return {
      canView: isOwnerOrAssignee,
      canUpdateStatus: isOwnerOrAssignee,
      canEdit: isCreator,
      canDelete: isCreator,
      canPin: isOwnerOrAssignee,
      canReorder: isOwnerOrAssignee,
    };
  }

  if (task.scope === "department") {
    const canManageDeptTask = isCreator || isDeptLeader;

    if (task.delegationType === "individual") {
      const canView = isCreator || isAssignee || isDeptLeader;
      return {
        canView,
        canUpdateStatus: canView,
        canEdit: canManageDeptTask,
        canDelete: canManageDeptTask,
        canPin: canView,
        canReorder: canManageDeptTask || isAssignee,
      };
    }

    // Delegação em grupo / equipe
    const canView = isDeptMember || isCreator;
    return {
      canView,
      canUpdateStatus: canView,
      canEdit: canManageDeptTask,
      canDelete: canManageDeptTask,
      canPin: canManageDeptTask,
      canReorder: canManageDeptTask,
    };
  }

  // scope === "organization"
  const canManageOrgTask =
    ctx.isAdmin || Boolean(ctx.canCreateOrganization) || isCreator;

  return {
    canView: true,
    canUpdateStatus: canManageOrgTask || isAssignee,
    canEdit: canManageOrgTask,
    canDelete: canManageOrgTask,
    canPin: canManageOrgTask,
    canReorder: canManageOrgTask,
  };
}
