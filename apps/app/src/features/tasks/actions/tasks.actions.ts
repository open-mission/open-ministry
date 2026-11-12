"use server";

import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireOrganizationContext } from "@/lib/organizations";
import { can } from "@/lib/permissions/service";
import { sentryLogger } from "@/lib/telemetry/sentry";
import { dispatchNotification } from "@/lib/notification-service";
import {
  createTask,
  deleteTask,
  getTaskAuditHistory,
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
  url: z.string().trim().url("URL inválida").or(z.literal("")).optional().nullable(),
  scope: z.enum(["personal", "department", "organization"]).default("personal"),
  departmentId: z.string().trim().optional().nullable(),
  assigneeId: z.string().trim().optional().nullable(),
  assigneePersonId: z.string().trim().optional().nullable(),
  delegationType: z.enum(["single", "shared", "individual"]).default("single"),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(["todo", "in_progress", "completed", "canceled"]).optional(),
});

export type ActionResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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
      const allowed = await can("tasks", "createDepartment", {
        departmentId: data.departmentId ?? undefined,
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

    // Disparar notificações push e in-app para cada membro atribuído
    const recipients = new Set<string>();
    for (const m of assignedMembers) {
      if (m.userId && m.userId !== userId && !recipients.has(m.userId)) {
        recipients.add(m.userId);
        dispatchNotification({
          organizationId: organization.id,
          type: "assignment",
          title: `Nova tarefa: ${data.title}`,
          body: `${session.user.name ?? "A liderança"} delegou uma tarefa para você.`,
          href: "/tasks",
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
                href: "/tasks",
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
    return { ok: true, data: { id: primaryTask.id, createdCount, task: primaryTask } };
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "createTaskAction",
    });
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao criar tarefa.",
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
    const { organization, session } = await requireOrganizationContext();
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

    const allowed = await can("tasks", "update");
    if (!allowed) {
      return {
        ok: false,
        error: "Você não tem permissão para editar esta tarefa.",
      };
    }

    const data = parsed.data;
    const updated = await updateTask(organization.id, userId, taskId, {
      ...data,
      url: data.url !== undefined ? (data.url && data.url.length > 0 ? data.url : null) : undefined,
    });

    sentryLogger.info(`Tarefa '${updated.title}' atualizada com sucesso`);

    // Notificar novo responsável caso alterado e diferente do usuário atual
    if (data.assigneeId && data.assigneeId !== userId) {
      dispatchNotification({
        organizationId: organization.id,
        type: "assignment",
        title: `Nova atribuição: ${updated.title}`,
        body: `${session.user.name ?? "A liderança"} atribuiu uma tarefa para você.`,
        href: "/tasks",
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
    return { ok: true, data: { id: updated.id, task: updated } };
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "updateTaskAction",
      taskId,
    });
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao atualizar tarefa.",
    };
  }
}

/**
 * Atualiza o status de uma tarefa (ex: drag and drop no kanban ou checkbox na lista).
 */
export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus,
): Promise<ActionResponse<{ id: string; status: TaskStatus }>> {
  try {
    const { organization, session } = await requireOrganizationContext();
    const userId = session.user.id;

    sentryLogger.setScopeContext({
      action: "updateTaskStatusAction",
      organizationId: organization.id,
      userId,
      taskId,
    });

    const allowed = await can("tasks", "update");
    if (!allowed) {
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
    return { ok: true, data: { id: updated.id, status: updated.status as TaskStatus } };
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
    const { organization, session } = await requireOrganizationContext();
    const userId = session.user.id;

    sentryLogger.setScopeContext({
      action: "reorderTasksAction",
      organizationId: organization.id,
      userId,
    });

    await reorderTasks(organization.id, userId, orderedTaskIds);

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
      error:
        error instanceof Error ? error.message : "Falha ao reordenar tarefas.",
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
    const { organization, session } = await requireOrganizationContext();
    const userId = session.user.id;

    const isPinned = await toggleTaskPin(organization.id, userId, taskId);

    revalidatePath("/tasks");
    revalidatePath("/dashboard/tasks");
    return { ok: true, data: { isPinned } };
  } catch (error) {
    Sentry.captureException(error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao fixar tarefa.",
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
    const { organization, session } = await requireOrganizationContext();
    const userId = session.user.id;

    sentryLogger.setScopeContext({
      action: "deleteTaskAction",
      organizationId: organization.id,
      userId,
      taskId,
    });

    const allowed = await can("tasks", "delete");
    if (!allowed) {
      return {
        ok: false,
        error: "Você não tem permissão para remover esta tarefa.",
      };
    }

    await deleteTask(organization.id, userId, taskId);

    sentryLogger.info(`Tarefa excluída com sucesso`, { taskId });

    revalidatePath("/tasks");
    revalidatePath("/dashboard/tasks");
    return { ok: true, data: undefined };
  } catch (error) {
    Sentry.captureException(error);
    sentryLogger.error(error instanceof Error ? error : String(error), {
      action: "deleteTaskAction",
      taskId,
    });
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao excluir tarefa.",
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
    const { organization } = await requireOrganizationContext();

    const logs = await getTaskAuditHistory(organization.id, taskId);
    return { ok: true, data: logs };
  } catch (error) {
    Sentry.captureException(error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao carregar histórico.",
    };
  }
}
