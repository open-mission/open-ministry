import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, asc, eq, inArray, or, ilike, sql } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { cacheInvalidateTags, remember } from "@/lib/cache";

export type TaskStatus = "todo" | "in_progress" | "completed" | "canceled";
export type TaskPriority = "none" | "low" | "medium" | "high";
export type TaskScope = "personal" | "department" | "organization";
export type DelegationType = "single" | "shared" | "individual";

export type TaskItem = typeof schema.task.$inferSelect & {
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  assignee: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  assigneePerson: {
    id: string;
    name: string;
    email: string | null;
    image: string | null;
  } | null;
  completedBy: {
    id: string;
    name: string | null;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  subtasks?: (typeof schema.task.$inferSelect)[];
};

export type TaskFilter = {
  tab?: "all" | "personal" | "delegated" | "department";
  status?: "all" | "active" | "completed" | TaskStatus;
  search?: string;
  departmentId?: string;
  tag?: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  date?: Date | string | null;
  deadline?: Date | string | null;
  tags?: string[];
  isPinned?: boolean;
  priority?: TaskPriority;
  status?: TaskStatus;
  url?: string | null;
  scope?: TaskScope;
  departmentId?: string | null;
  assigneeId?: string | null;
  assigneePersonId?: string | null;
  delegationType?: DelegationType;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  status?: TaskStatus;
};

/**
 * Consulta todas as tarefas visíveis para o usuário de acordo com suas permissões.
 */
export async function listTasks(options: {
  organizationId: string;
  userId: string;
  isAdmin?: boolean;
  ledDepartmentIds?: string[];
  memberDepartmentIds?: string[];
  filter?: TaskFilter;
}): Promise<TaskItem[]> {
  const {
    organizationId,
    userId,
    isAdmin = false,
    ledDepartmentIds = [],
    memberDepartmentIds = [],
    filter = {},
  } = options;

  const { tab = "all", status = "all", search, departmentId, tag } = filter;

  return remember(
    `tasks:${organizationId}:u:${userId}:${isAdmin ? 1 : 0}:${tab}:${status}:${search ?? ""}:${departmentId ?? ""}:${tag ?? ""}`,
    15,
    async () => {
      // 1. Cláusula de visibilidade básica
      let visibilityCondition;

      if (isAdmin) {
        // Admin vê tarefas da igreja/departamentos e apenas suas próprias pessoais (privacidade por padrão)
        visibilityCondition = and(
          eq(schema.task.organizationId, organizationId),
          or(
            eq(schema.task.scope, "organization"),
            eq(schema.task.scope, "department"),
            and(
              eq(schema.task.scope, "personal"),
              or(
                eq(schema.task.createdById, userId),
                eq(schema.task.assigneeId, userId),
              ),
            ),
          ),
        );
      } else {
        // Membro/líder: vê pessoais, atribuídas a si, ou de departamentos em que atua
        const conditions = [
          eq(schema.task.createdById, userId),
          eq(schema.task.assigneeId, userId),
          eq(schema.task.scope, "organization"),
        ];

        if (memberDepartmentIds.length > 0) {
          conditions.push(
            and(
              inArray(schema.task.departmentId, memberDepartmentIds),
              or(
                eq(schema.task.delegationType, "shared"),
                eq(schema.task.delegationType, "single"),
                eq(schema.task.assigneeId, userId),
              ),
            )!,
          );
        }

        if (ledDepartmentIds.length > 0) {
          conditions.push(inArray(schema.task.departmentId, ledDepartmentIds));
        }

        visibilityCondition = and(
          eq(schema.task.organizationId, organizationId),
          or(...conditions),
        );
      }

      // 2. Filtro por Aba (Contexto de uso)
      let tabCondition;
      if (tab === "personal") {
        tabCondition = or(
          and(
            eq(schema.task.createdById, userId),
            eq(schema.task.scope, "personal"),
          ),
          eq(schema.task.assigneeId, userId),
        );
      } else if (tab === "delegated") {
        tabCondition = and(
          eq(schema.task.createdById, userId),
          or(
            sql`${schema.task.assigneeId} IS NOT NULL AND ${schema.task.assigneeId} != ${userId}`,
            sql`${schema.task.departmentId} IS NOT NULL`,
            eq(schema.task.scope, "organization"),
          ),
        );
      } else if (tab === "department") {
        tabCondition = sql`${schema.task.departmentId} IS NOT NULL`;
      }

      // 3. Filtro por Status
      let statusCondition;
      if (status === "active") {
        statusCondition = or(
          eq(schema.task.status, "todo"),
          eq(schema.task.status, "in_progress"),
        );
      } else if (status === "completed") {
        statusCondition = or(
          eq(schema.task.status, "completed"),
          eq(schema.task.status, "canceled"),
        );
      } else if (status !== "all") {
        statusCondition = eq(schema.task.status, status);
      }

      // 4. Filtro por Departamento específico
      let specificDeptCondition;
      if (departmentId && departmentId !== "all") {
        specificDeptCondition = eq(schema.task.departmentId, departmentId);
      }

      // 5. Filtro por Busca de texto
      let searchCondition;
      if (search && search.trim().length > 0) {
        const query = `%${search.trim()}%`;
        searchCondition = or(
          ilike(schema.task.title, query),
          ilike(schema.task.description, query),
        );
      }

      const finalWhere = and(
        visibilityCondition,
        tabCondition,
        statusCondition,
        specificDeptCondition,
        searchCondition,
      );

      const rows = await db.query.task.findMany({
        where: finalWhere,
        with: {
          createdBy: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          assignee: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          assigneePerson: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          completedBy: {
            columns: {
              id: true,
              name: true,
            },
          },
          department: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          desc(schema.task.isPinned),
          asc(schema.task.sortOrder),
          asc(schema.task.deadline),
          asc(schema.task.date),
          desc(schema.task.createdAt),
        ],
      });

      // Se houver filtro por tag em memória
      if (tag && tag !== "all") {
        return rows.filter((r) =>
          Array.isArray(r.tags)
            ? r.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
            : false,
        ) as TaskItem[];
      }

      return rows as TaskItem[];
    },
    [`tasks:${organizationId}`],
  );
}

async function getHydratedTask(taskId: string): Promise<TaskItem | null> {
  const row = await db.query.task.findFirst({
    where: eq(schema.task.id, taskId),
    with: {
      createdBy: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      assignee: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      assigneePerson: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      department: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });
  return (row as TaskItem) ?? null;
}

/**
 * Cria uma nova tarefa (pessoal, compartilhada de departamento ou individual para membros).
 */
export async function createTask(
  organizationId: string,
  actorUserId: string,
  data: CreateTaskInput,
): Promise<{
  primaryTask: TaskItem;
  createdCount: number;
  assignedMembers: { userId: string; personId?: string }[];
}> {
  const scope = data.scope ?? "personal";
  const delegationType = data.delegationType ?? "single";

  const dateValue = data.date ? new Date(data.date) : null;
  const deadlineValue = data.deadline ? new Date(data.deadline) : null;

  // 1. Caso seja delegação individual para cada membro do departamento
  if (
    scope === "department" &&
    data.departmentId &&
    delegationType === "individual"
  ) {
    const parentId = randomUUID();

    // Cria a tarefa mestre/modelo
    const [parentTask] = await db
      .insert(schema.task)
      .values({
        id: parentId,
        organizationId,
        title: data.title,
        description: data.description ?? null,
        date: dateValue,
        deadline: deadlineValue,
        tags: data.tags ?? [],
        isPinned: data.isPinned ?? false,
        status: data.status ?? "todo",
        priority: data.priority ?? "none",
        url: data.url ?? null,
        scope: "department",
        departmentId: data.departmentId,
        createdById: actorUserId,
        assigneeId: null,
        assigneePersonId: null,
        delegationType: "individual",
        isRecurring: data.isRecurring ?? false,
        recurrenceRule: data.recurrenceRule ?? null,
        sortOrder: 0,
      })
      .returning();

    // Busca todos os membros do departamento com usuário vinculado
    const members = await db.query.departmentMember.findMany({
      where: eq(schema.departmentMember.departmentId, data.departmentId),
      with: {
        person: true,
      },
    });

    const childTasksToInsert: (typeof schema.task.$inferInsert)[] = members.map((m, idx) => ({
      id: randomUUID(),
      organizationId,
      title: data.title,
      description: data.description ?? null,
      date: dateValue,
      deadline: deadlineValue,
      tags: data.tags ?? [],
      isPinned: false,
      status: "todo",
      priority: data.priority ?? "none",
      url: data.url ?? null,
      scope: "department",
      departmentId: data.departmentId,
      createdById: actorUserId,
      assigneeId: m.person?.userId ?? null,
      assigneePersonId: m.person?.id ?? null,
      delegationType: "individual",
      parentTaskId: parentId,
      isRecurring: false,
      sortOrder: idx + 1,
    }));

    if (childTasksToInsert.length > 0) {
      await db.insert(schema.task).values(childTasksToInsert);
    }

    // Registrar auditoria
    await db.insert(schema.taskAuditLog).values([
      {
        id: randomUUID(),
        taskId: parentId,
        organizationId,
        actorId: actorUserId,
        action: "created",
        details: {
          title: data.title,
          scope,
          departmentId: data.departmentId,
          delegationType: "individual",
          dispatchedCount: childTasksToInsert.length,
        },
      },
      ...childTasksToInsert.map((c) => ({
        id: randomUUID(),
        taskId: c.id,
        organizationId,
        actorId: actorUserId,
        action: "created",
        details: {
          title: c.title,
          parentTaskId: parentId,
          assigneeUserId: c.assigneeId,
          assigneePersonId: c.assigneePersonId,
        },
      })),
    ]);

    await cacheInvalidateTags(`tasks:${organizationId}`);

    const hydrated = (await getHydratedTask(parentId)) ?? (parentTask as unknown as TaskItem);

    return {
      primaryTask: hydrated,
      createdCount: childTasksToInsert.length + 1,
      assignedMembers: members
        .filter((m) => m.person?.userId)
        .map((m) => ({
          userId: m.person!.userId!,
          personId: m.person?.id ?? undefined,
        })),
    };
  }

  // 2. Tarefa comum (pessoal, compartilhada de departamento ou institucional)
  const taskId = randomUUID();
  const [created] = await db
    .insert(schema.task)
    .values({
      id: taskId,
      organizationId,
      title: data.title,
      description: data.description ?? null,
      date: dateValue,
      deadline: deadlineValue,
      tags: data.tags ?? [],
      isPinned: data.isPinned ?? false,
      status: data.status ?? "todo",
      priority: data.priority ?? "none",
      url: data.url ?? null,
      scope,
      departmentId: data.departmentId ?? null,
      createdById: actorUserId,
      assigneeId: data.assigneeId ?? (scope === "personal" ? actorUserId : null),
      assigneePersonId: data.assigneePersonId ?? null,
      delegationType,
      isRecurring: data.isRecurring ?? false,
      recurrenceRule: data.recurrenceRule ?? null,
      sortOrder: 0,
    })
    .returning();

  // Registrar auditoria
  await db.insert(schema.taskAuditLog).values({
    id: randomUUID(),
    taskId,
    organizationId,
    actorId: actorUserId,
    action: "created",
    details: {
      title: data.title,
      scope,
      departmentId: data.departmentId ?? null,
      assigneeId: created.assigneeId,
      delegationType,
      isRecurring: data.isRecurring ?? false,
    },
  });

  await cacheInvalidateTags(`tasks:${organizationId}`);

  const hydrated = (await getHydratedTask(taskId)) ?? (created as unknown as TaskItem);

  return {
    primaryTask: hydrated,
    createdCount: 1,
    assignedMembers: created.assigneeId
      ? [{ userId: created.assigneeId, personId: created.assigneePersonId ?? undefined }]
      : [],
  };
}

/**
 * Atualiza campos de uma tarefa existente com histórico auditável.
 */
export async function updateTask(
  organizationId: string,
  actorUserId: string,
  taskId: string,
  data: UpdateTaskInput,
): Promise<TaskItem> {
  const existing = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, taskId),
      eq(schema.task.organizationId, organizationId),
    ),
  });

  if (!existing) {
    throw new Error("Tarefa não encontrada.");
  }

  const patch: Partial<typeof schema.task.$inferInsert> = {};
  const diff: Record<string, { from: unknown; to: unknown }> = {};

  if (data.title !== undefined && data.title !== existing.title) {
    patch.title = data.title;
    diff.title = { from: existing.title, to: data.title };
  }

  if (data.description !== undefined && data.description !== existing.description) {
    patch.description = data.description;
    diff.description = { from: existing.description, to: data.description };
  }

  if (data.date !== undefined) {
    const nextDate = data.date ? new Date(data.date) : null;
    const prevDate = existing.date ? new Date(existing.date) : null;
    if (nextDate?.getTime() !== prevDate?.getTime()) {
      patch.date = nextDate;
      diff.date = { from: prevDate?.toISOString(), to: nextDate?.toISOString() };
    }
  }

  if (data.deadline !== undefined) {
    const nextDeadline = data.deadline ? new Date(data.deadline) : null;
    const prevDeadline = existing.deadline ? new Date(existing.deadline) : null;
    if (nextDeadline?.getTime() !== prevDeadline?.getTime()) {
      patch.deadline = nextDeadline;
      diff.deadline = {
        from: prevDeadline?.toISOString(),
        to: nextDeadline?.toISOString(),
      };
    }
  }

  if (data.tags !== undefined) {
    patch.tags = data.tags;
    diff.tags = { from: existing.tags, to: data.tags };
  }

  if (data.isPinned !== undefined && data.isPinned !== existing.isPinned) {
    patch.isPinned = data.isPinned;
    diff.isPinned = { from: existing.isPinned, to: data.isPinned };
  }

  if (data.priority !== undefined && data.priority !== existing.priority) {
    patch.priority = data.priority;
    diff.priority = { from: existing.priority, to: data.priority };
  }

  if (data.url !== undefined && data.url !== existing.url) {
    patch.url = data.url;
    diff.url = { from: existing.url, to: data.url };
  }

  if (data.departmentId !== undefined && data.departmentId !== existing.departmentId) {
    patch.departmentId = data.departmentId;
    diff.departmentId = { from: existing.departmentId, to: data.departmentId };
  }

  if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
    patch.assigneeId = data.assigneeId;
    diff.assigneeId = { from: existing.assigneeId, to: data.assigneeId };
  }

  if (data.status !== undefined && data.status !== existing.status) {
    patch.status = data.status;
    diff.status = { from: existing.status, to: data.status };

    if (data.status === "completed") {
      patch.completedAt = new Date();
      patch.completedById = actorUserId;
    } else if (existing.status === "completed") {
      patch.completedAt = null;
      patch.completedById = null;
    }
  }

  if (data.isRecurring !== undefined && data.isRecurring !== existing.isRecurring) {
    patch.isRecurring = data.isRecurring;
    diff.isRecurring = { from: existing.isRecurring, to: data.isRecurring };
  }

  if (
    data.recurrenceRule !== undefined &&
    data.recurrenceRule !== existing.recurrenceRule
  ) {
    patch.recurrenceRule = data.recurrenceRule;
    diff.recurrenceRule = {
      from: existing.recurrenceRule,
      to: data.recurrenceRule,
    };
  }

  const [updated] = await db
    .update(schema.task)
    .set(patch)
    .where(
      and(
        eq(schema.task.id, taskId),
        eq(schema.task.organizationId, organizationId),
      ),
    )
    .returning();

  // Se houve mudanças de campos, registra auditoria
  if (Object.keys(diff).length > 0) {
    const action = diff.status ? "status_changed" : "updated";
    await db.insert(schema.taskAuditLog).values({
      id: randomUUID(),
      taskId,
      organizationId,
      actorId: actorUserId,
      action,
      details: diff,
    });
  }

  await cacheInvalidateTags(`tasks:${organizationId}`);

  const hydrated = await getHydratedTask(taskId);
  return (hydrated ?? (updated as unknown as TaskItem));
}

/**
 * Atualiza rapidamente o status de uma tarefa (ex: drag and drop ou checkbox).
 */
export async function updateTaskStatus(
  organizationId: string,
  actorUserId: string,
  taskId: string,
  status: TaskStatus,
): Promise<TaskItem> {
  return updateTask(organizationId, actorUserId, taskId, { status });
}

/**
 * Reordena uma lista de tarefas (drag and drop na visualização lista ou kanban).
 */
export async function reorderTasks(
  organizationId: string,
  actorUserId: string,
  orderedTaskIds: string[],
): Promise<void> {
  if (orderedTaskIds.length === 0) return;

  await db.transaction(async (tx) => {
    for (let index = 0; index < orderedTaskIds.length; index++) {
      const id = orderedTaskIds[index];
      await tx
        .update(schema.task)
        .set({ sortOrder: index })
        .where(
          and(
            eq(schema.task.id, id),
            eq(schema.task.organizationId, organizationId),
          ),
        );
    }
  });

  await db.insert(schema.taskAuditLog).values({
    id: randomUUID(),
    taskId: orderedTaskIds[0],
    organizationId,
    actorId: actorUserId,
    action: "reordered",
    details: {
      count: orderedTaskIds.length,
      orderedTaskIds,
    },
  });

  await cacheInvalidateTags(`tasks:${organizationId}`);
}

/**
 * Alterna o estado fixado (pin) de uma tarefa.
 */
export async function toggleTaskPin(
  organizationId: string,
  actorUserId: string,
  taskId: string,
): Promise<boolean> {
  const existing = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, taskId),
      eq(schema.task.organizationId, organizationId),
    ),
  });

  if (!existing) {
    throw new Error("Tarefa não encontrada.");
  }

  const nextPinned = !existing.isPinned;

  await db
    .update(schema.task)
    .set({ isPinned: nextPinned })
    .where(
      and(
        eq(schema.task.id, taskId),
        eq(schema.task.organizationId, organizationId),
      ),
    );

  await db.insert(schema.taskAuditLog).values({
    id: randomUUID(),
    taskId,
    organizationId,
    actorId: actorUserId,
    action: "updated",
    details: {
      isPinned: { from: existing.isPinned, to: nextPinned },
    },
  });

  await cacheInvalidateTags(`tasks:${organizationId}`);

  return nextPinned;
}

/**
 * Remove uma tarefa com registro prévio de auditoria.
 */
export async function deleteTask(
  organizationId: string,
  actorUserId: string,
  taskId: string,
): Promise<void> {
  const existing = await db.query.task.findFirst({
    where: and(
      eq(schema.task.id, taskId),
      eq(schema.task.organizationId, organizationId),
    ),
  });

  if (!existing) {
    return;
  }

  // Exclui a tarefa (a exclusão cascateia os logs de auditoria se configurado com cascade,
  // ou removemos após)
  await db
    .delete(schema.task)
    .where(
      and(
        eq(schema.task.id, taskId),
        eq(schema.task.organizationId, organizationId),
      ),
    );

  await cacheInvalidateTags(`tasks:${organizationId}`);
}

/**
 * Obtém a trilha de auditoria e histórico de uma tarefa.
 */
export async function getTaskAuditHistory(
  organizationId: string,
  taskId: string,
) {
  const logs = await db.query.taskAuditLog.findMany({
    where: and(
      eq(schema.taskAuditLog.taskId, taskId),
      eq(schema.taskAuditLog.organizationId, organizationId),
    ),
    with: {
      actor: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: [desc(schema.taskAuditLog.createdAt)],
  });

  return logs;
}

export async function getTaskForAuth(organizationId: string, taskId: string) {
  return db.query.task.findFirst({
    where: and(
      eq(schema.task.id, taskId),
      eq(schema.task.organizationId, organizationId),
    ),
    columns: {
      id: true,
      scope: true,
      createdById: true,
      assigneeId: true,
      departmentId: true,
      delegationType: true,
      title: true,
    },
  });
}

export async function getTasksForAuth(
  organizationId: string,
  taskIds: string[],
) {
  if (taskIds.length === 0) return [];
  return db.query.task.findMany({
    where: and(
      inArray(schema.task.id, taskIds),
      eq(schema.task.organizationId, organizationId),
    ),
    columns: {
      id: true,
      scope: true,
      createdById: true,
      assigneeId: true,
      departmentId: true,
      delegationType: true,
    },
  });
}
