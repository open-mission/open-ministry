"use server";

import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getPersonMembershipsForUser } from "@/lib/agenda";
import { dispatchNotification } from "@/lib/notification-service";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import { sentryLogger } from "@/lib/telemetry/sentry";
import {
  resolveTaskCapabilities,
  type TaskPermissionContext,
} from "../lib/task-permissions";
import {
  createTask,
  deleteTask,
  getTaskAuditHistory,
  getTaskForAuth,
  getTasksForAuth,
  reorderTasks,
  toggleTaskPin,
  updateTask,
  updateTaskStatus,
  type TaskItem,
  type TaskStatus,
} from "../services/tasks-service";

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "O título da tarefa é obrigatório.").max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  tags: z.array(z.string().trim()).default([]),
  isPinned: z.boolean().default(false),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  status: z.enum(["todo", "in_progress", "completed", "canceled"]).optional(),
  url: z
    .string()
    .trim()
    .url("URL inválida")
    .or(z.literal(""))
    .optional()
    .nullable(),
  scope: z.enum(["personal", "department", "organization"]).default("personal"),
  departmentId: z.string().trim().optional().nullable(),
  assigneeId: z.string().trim().optional().nullable(),
  assigneePersonId: z.string().trim().optional().nullable(),
  delegationType: z.enum(["single", "shared", "individual"]).default("single"),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.partial();

export type ActionResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function loadTaskActorContext(
  organizationId: string,
  userId: string,
  isAdmin: boolean,
): Promise<TaskPermissionContext> {
  const [memberships, canCreateOrganization] = await Promise.all([
    getPersonMembershipsForUser(organizationId, userId),
    can("tasks", "createOrganization"),
  ]);

  return {
    userId,
    isAdmin,
    ledDepartmentIds: memberships
      .filter((m) => m.isLeader)
      .map((m) => m.departmentId),
    memberDepartmentIds: memberships.map((m) => m.departmentId),
    canCreateOrganization,
  };
}

function buildTaskNotificationHref(scope: string, taskId: string): string {
  const tab = scope === "personal" ? "personal" : "department";
  return `/dashboard/tasks?tab=${tab}&taskId=${encodeURIComponent(taskId)}`;
}

/**
 * Cria uma nova tarefa pessoal ou delegada.
 */
export async function createTaskAction(
  rawInput: unknown,
): Promise<ActionResponse<{ id: string; createdCount: number; task?: TaskItem }>> {
  try {
    const { organization, session } = await requireOrganizationContext();
    const userId = session.user.id;

    sentryLogger.setScopeContext({
      action: "createTaskAction",
      organizationId: organization.id,
      userId,
    });

    const parsed = createTaskSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }

    const data = parsed.data;

    // Checagem de permissão conforme escopo
    if (data.scope === "department") {
      if (!data.departmentId) {
        return {
          ok: false,
          error: "Selecione um departamento para delegar esta tarefa.",
        };
      }
      const allowed = await can("tasks", "createDepartment", {
        departmentId: data.departmentId,
      });
      if (!allowed) {
        return {
          ok: false,
          error: "Você não tem permissão para delegar tarefas a este departamento.",
        };
      }
    } else if (data.scope === "organization") {
      const allowed = await can("tasks", "createOrganization");
      if (!allowed) {
        return {
          ok: false,
          error: "Apenas administradores podem criar tarefas para toda a igreja.",
        };
      }
    } else {
      const allowed = await can("tasks", "createPersonal");
      if (!allowed) {
        return {
          ok: false,
          error: "O módulo de tarefas não está habilitado para o seu perfil.",
        };
      }
    }

    const { primaryTask, createdCount, assignedMembers } = await createTask(
      organization.id,
      userId,
      {
        ...data,
        url: data.url && data.url.length > 0 ? data.url : null,
      },
    );

    sentryLogger.info(
      sentryLogger.fmt`Tarefa '${data.title}' criada com sucesso por ${session.user.name ?? userId}`,
      {
        taskId: primaryTask.id,
        scope: data.scope,
        createdCount,
      },
    );

    const personalNotifHref =
      createdCount > 1
        ? "/dashboard/tasks?tab=personal"
        : buildTaskNotificationHref("personal", primaryTask.id);

    // Disparar notificações para cada membro atribuído
    const recipients = new Set<string>();
    for (const m of assignedMembers) {
      if (m.userId && m.userId !== userId && !recipients.has(m.userId)) {
        recipients.add(m.userId);
        dispatchNotification({
          organizationId: organization.id,
          type: "assignment",
          title: `Nova tarefa: ${data.title}`,
          body: `${session.user.name ?? "A liderança"} delegou uma tarefa para você.`,
          href: personalNotifHref,
          actorId: userId,
          userId: m.userId,
          personId: m.personId ?? undefined,
          channels: ["in_app", "push"],
        }).catch((err) => {
          sentryLogger.warn("Falha ao enviar notificação de tarefa delegada", {
            error: String(err),
          });
        });
      }
    }

    // Se foi tarefa compartilhada atribuída ao departamento inteiro
    if (
      data.scope === "department" &&
      data.departmentId &&
      data.delegationType !== "individual"
    ) {
      const deptHref = buildTaskNotificationHref("department", primaryTask.id);
      db.query.departmentMember
        .findMany({
          where: eq(schema.departmentMember.departmentId, data.departmentId),
          with: { person: true },
        })
        .then((deptMembers) => {
          for (const dm of deptMembers) {
            const uid = dm.person?.userId;
            if (uid && uid !== userId && !recipients.has(uid)) {
              recipients.add(uid);
              dispatchNotification({
                organizationId: organization.id,
                type: "assignment",
                title: `Nova tarefa de equipe: ${data.title}`,
                body: `${session.user.name ?? "A liderança"} criou uma tarefa compartilhada para o seu departamento.`,
                href: deptHref,
                actorId: userId,
                userId: uid,
                personId: dm.person?.id,
                channels: ["in_app", "push"],
              }).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/");
    return { ok: true, data: { id: primaryTask.id, createdCount, task: primaryTask } };
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "createTaskAction",
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao criar tarefa.",
    };
  }
}

/**
 * Atualiza campos de uma tarefa existente.
 */
export async function updateTaskAction(
  taskId: string,
  rawInput: unknown,
): Promise<ActionResponse<{ id: string; task?: TaskItem }>> {
  try {
    const { organization, session, isAdmin } = await requireOrganizationContext();
    const userId = session.user.id;

    sentryLogger.setScopeContext({
      action: "updateTaskAction",
      organizationId: organization.id,
      userId,
      taskId,
    });

    const parsed = updateTaskSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }

    const existing = await getTaskForAuth(organization.id, taskId);
    if (!existing) {
      return { ok: false, error: "Tarefa não encontrada." };
    }

    const data = parsed.data;
    const definedKeys = Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);
    const isStatusOnly =
      definedKeys.length > 0 &&
      definedKeys.every((key) => key === "status");

    const [actorCtx, policyAllowed] = await Promise.all([
      loadTaskActorContext(organization.id, userId, isAdmin),
      can(
        "tasks",
        "update",
        existing.departmentId ? { departmentId: existing.departmentId } : undefined,
      ),
    ]);

    const capabilities = resolveTaskCapabilities(existing, actorCtx);
    const hasTaskPrivilege = isStatusOnly
      ? capabilities.canUpdateStatus
      : capabilities.canEdit;

    if (!policyAllowed || !hasTaskPrivilege) {
      return {
        ok: false,
        error: "Você não tem permissão para editar esta tarefa.",
      };
    }

    if (
      data.scope === "organization" &&
      existing.scope !== "organization" &&
      !isAdmin &&
      !actorCtx.canCreateOrganization
    ) {
      return {
        ok: false,
        error: "Apenas administradores podem publicar tarefas para toda a igreja.",
      };
    }

    if (data.scope === "department" && data.departmentId) {
      const canTargetDept = await can("tasks", "createDepartment", {
        departmentId: data.departmentId,
      });
      if (!canTargetDept && !isAdmin) {
        return {
          ok: false,
          error: "Você não tem permissão para vincular esta tarefa ao departamento.",
        };
      }
    }

    const updated = await updateTask(organization.id, userId, taskId, {
      ...data,
      url:
        data.url !== undefined
          ? data.url && data.url.length > 0
            ? data.url
            : null
          : undefined,
    });

    sentryLogger.info(`Tarefa '${updated.title}' atualizada com sucesso`);

    // Notificar novo responsável caso alterado e diferente do usuário atual
    if (
      data.assigneeId &&
      data.assigneeId !== userId &&
      data.assigneeId !== existing.assigneeId
    ) {
      dispatchNotification({
        organizationId: organization.id,
        type: "assignment",
        title: `Nova atribuição: ${updated.title}`,
        body: `${session.user.name ?? "A liderança"} atribuiu uma tarefa para você.`,
        href: buildTaskNotificationHref(updated.scope, updated.id),
        actorId: userId,
        userId: data.assigneeId,
        personId: data.assigneePersonId ?? undefined,
        channels: ["in_app", "push"],
      }).catch((err) => {
        sentryLogger.warn("Falha ao enviar notificação de tarefa atribuída", {
          error: String(err),
        });
      });
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/");
    return { ok: true, data: { id: updated.id, task: updated } };
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "updateTaskAction",
      taskId,
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao atualizar tarefa.",
    };
  }
}

/**
 * Atualiza o status de uma tarefa (ex: drag and drop no kanban ou checkbox na lista).
 */
export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus,
): Promise<ActionResponse<{ id: string; status: TaskStatus; task?: TaskItem }>> {
  try {
    const { organization, session, isAdmin } = await requireOrganizationContext();
    const userId = session.user.id;

    sentryLogger.setScopeContext({
      action: "updateTaskStatusAction",
      organizationId: organization.id,
      userId,
      taskId,
    });

    const existing = await getTaskForAuth(organization.id, taskId);
    if (!existing) {
      return { ok: false, error: "Tarefa não encontrada." };
    }

    const [actorCtx, policyAllowed] = await Promise.all([
      loadTaskActorContext(organization.id, userId, isAdmin),
      can(
        "tasks",
        "update",
        existing.departmentId ? { departmentId: existing.departmentId } : undefined,
      ),
    ]);

    const capabilities = resolveTaskCapabilities(existing, actorCtx);
    if (!policyAllowed || !capabilities.canUpdateStatus) {
      return {
        ok: false,
        error: "Você não tem permissão para alterar o status desta tarefa.",
      };
    }

    const updated = await updateTaskStatus(
      organization.id,
      userId,
      taskId,
      status,
    );

    sentryLogger.info(
      sentryLogger.fmt`Status da tarefa '${updated.title}' alterado para '${status}'`,
    );

    revalidatePath("/tasks");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/");
    return {
      ok: true,
      data: { id: updated.id, status: updated.status as TaskStatus, task: updated },
    };
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "updateTaskStatusAction",
      taskId,
    });
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao atualizar status da tarefa.",
    };
  }
}

/**
 * Reordena tarefas manualmente via drag and drop.
 */
export async function reorderTasksAction(
  orderedTaskIds: string[],
): Promise<ActionResponse<void>> {
  try {
    const { organization, session, isAdmin } = await requireOrganizationContext();
    const userId = session.user.id;

    sentryLogger.setScopeContext({
      action: "reorderTasksAction",
      organizationId: organization.id,
      userId,
    });

    const uniqueIds = Array.from(new Set(orderedTaskIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return { ok: true, data: undefined };
    }

    const [policyAllowed, actorCtx, subjects] = await Promise.all([
      can("tasks", "update"),
      loadTaskActorContext(organization.id, userId, isAdmin),
      getTasksForAuth(organization.id, uniqueIds),
    ]);

    if (!policyAllowed || subjects.length !== uniqueIds.length) {
      return {
        ok: false,
        error: "Você não tem permissão para reordenar estas tarefas.",
      };
    }

    const allPermitted = subjects.every(
      (task) => resolveTaskCapabilities(task, actorCtx).canReorder,
    );
    if (!allPermitted) {
      return {
        ok: false,
        error: "Você não tem permissão para reordenar uma ou mais tarefas selecionadas.",
      };
    }

    await reorderTasks(organization.id, userId, uniqueIds);

    revalidatePath("/tasks");
    revalidatePath("/dashboard/tasks");
    return { ok: true, data: undefined };
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "reorderTasksAction",
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao reordenar tarefas.",
    };
  }
}

/**
 * Alterna a fixação de uma tarefa no topo.
 */
export async function toggleTaskPinAction(
  taskId: string,
): Promise<ActionResponse<{ isPinned: boolean }>> {
  try {
    const { organization, session, isAdmin } = await requireOrganizationContext();
    const userId = session.user.id;

    const existing = await getTaskForAuth(organization.id, taskId);
    if (!existing) {
      return { ok: false, error: "Tarefa não encontrada." };
    }

    const [actorCtx, policyAllowed] = await Promise.all([
      loadTaskActorContext(organization.id, userId, isAdmin),
      can(
        "tasks",
        "update",
        existing.departmentId ? { departmentId: existing.departmentId } : undefined,
      ),
    ]);

    const capabilities = resolveTaskCapabilities(existing, actorCtx);
    if (!policyAllowed || !capabilities.canPin) {
      return {
        ok: false,
        error: "Você não tem permissão para destacar esta tarefa.",
      };
    }

    const isPinned = await toggleTaskPin(organization.id, userId, taskId);

    revalidatePath("/tasks");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/");
    return { ok: true, data: { isPinned } };
  } catch (error) {
    Sentry.captureException(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao fixar tarefa.",
    };
  }
}

/**
 * Exclui uma tarefa.
 */
export async function deleteTaskAction(
  taskId: string,
): Promise<ActionResponse<void>> {
  try {
    const { organization, session, isAdmin } = await requireOrganizationContext();
    const userId = session.user.id;

    sentryLogger.setScopeContext({
      action: "deleteTaskAction",
      organizationId: organization.id,
      userId,
      taskId,
    });

    const existing = await getTaskForAuth(organization.id, taskId);
    if (!existing) {
      return { ok: false, error: "Tarefa não encontrada." };
    }

    const [actorCtx, policyAllowed] = await Promise.all([
      loadTaskActorContext(organization.id, userId, isAdmin),
      can(
        "tasks",
        "delete",
        existing.departmentId ? { departmentId: existing.departmentId } : undefined,
      ),
    ]);

    const capabilities = resolveTaskCapabilities(existing, actorCtx);
    if (!policyAllowed || !capabilities.canDelete) {
      return {
        ok: false,
        error: "Você não tem permissão para remover esta tarefa.",
      };
    }

    await deleteTask(organization.id, userId, taskId);

    sentryLogger.info(`Tarefa excluída com sucesso`, { taskId });

    revalidatePath("/tasks");
    revalidatePath("/dashboard/tasks");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "deleteTaskAction",
      taskId,
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao excluir tarefa.",
    };
  }
}

/**
 * Consulta o histórico auditável de uma tarefa.
 */
export async function getTaskAuditHistoryAction(
  taskId: string,
): Promise<ActionResponse<Awaited<ReturnType<typeof getTaskAuditHistory>>>> {
  try {
    const { organization, session, isAdmin } = await requireOrganizationContext();
    const userId = session.user.id;

    const existing = await getTaskForAuth(organization.id, taskId);
    if (!existing) {
      return { ok: false, error: "Tarefa não encontrada." };
    }

    const [actorCtx, policyAllowed] = await Promise.all([
      loadTaskActorContext(organization.id, userId, isAdmin),
      can(
        "tasks",
        "read",
        existing.departmentId ? { departmentId: existing.departmentId } : undefined,
      ),
    ]);

    const capabilities = resolveTaskCapabilities(existing, actorCtx);
    if (!policyAllowed || !capabilities.canView) {
      return {
        ok: false,
        error: "Você não tem permissão para consultar o histórico desta tarefa.",
      };
    }

    const logs = await getTaskAuditHistory(organization.id, taskId);
    return { ok: true, data: logs };
  } catch (error) {
    Sentry.captureException(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao carregar histórico.",
    };
  }
}
