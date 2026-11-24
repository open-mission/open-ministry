"use client";

import { useState } from "react";
import Link from "next/link";
import { isToday, isTomorrow } from "date-fns";
import { ArrowRightIcon, PlusIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { TaskCheckbox } from "@/components/home/task-checkbox";
import { HomeSection } from "@/components/home/home-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskDetailDialog } from "@/features/tasks/components/task-detail-dialog";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import { resolveTaskCapabilities } from "@/features/tasks/lib/task-permissions";
import { formatTaskDeadline } from "@/features/tasks/lib/task-utils";
import type { TaskItem, TaskStatus } from "@/features/tasks/services/tasks-service";
import { cn } from "@/lib/utils";

type DepartmentOption = {
  id: string;
  name: string;
};

type MemberOption = {
  id?: string;
  userId: string;
  personId?: string;
  name: string;
  email?: string | null;
};

export type TasksCardProps = {
  tasks: TaskItem[];
  currentUserId?: string;
  isAdmin?: boolean;
  ledDepartmentIds?: string[];
  memberDepartmentIds?: string[];
  departments?: DepartmentOption[];
  members?: MemberOption[];
  /** `folio` integra a lista ao caderno pastoral do desktop, sem card externo. */
  variant?: "card" | "folio";
  /** Quando true, mostra um estado vazio acolhedor em vez de sumir. */
  showEmptyState?: boolean;
};

/** Cores semânticas para o prazo, aplicadas ao checkbox e ao badge. */
function deadlineTone(
  deadline: Date | string | null | undefined,
  isOverdue: boolean,
): { checkbox: string; badge: string } {
  if (isOverdue) {
    return {
      checkbox: "border-destructive",
      badge: "border-0 bg-destructive/15 text-destructive",
    };
  }

  if (deadline) {
    const date = new Date(deadline);
    if (isToday(date)) {
      return {
        checkbox: "border-accent-foreground",
        badge: "border-0 bg-accent text-accent-foreground",
      };
    }
    if (isTomorrow(date)) {
      return {
        checkbox: "border-primary",
        badge: "border-0 bg-primary/15 text-primary",
      };
    }
  }

  return {
    checkbox: "border-muted-foreground/50",
    badge: "border-0 bg-muted text-muted-foreground",
  };
}

export function TasksCard({
  tasks,
  currentUserId,
  isAdmin = false,
  ledDepartmentIds = [],
  memberDepartmentIds = [],
  departments = [],
  members = [],
  variant = "card",
  showEmptyState = false,
}: TasksCardProps) {
  const [taskList, setTaskList] = useState<TaskItem[]>(tasks);
  const [previousTasks, setPreviousTasks] = useState(tasks);

  if (tasks !== previousTasks) {
    setPreviousTasks(tasks);
    setTaskList(tasks);
  }

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const activeCount = taskList.filter(
    (task) => task.status === "todo" || task.status === "in_progress",
  ).length;
  const activeTasks = taskList
    .filter((task) => task.status === "todo" || task.status === "in_progress")
    .slice(0, 3);

  const handleStatusChange = (taskId: string, nextStatus: TaskStatus) => {
    setTaskList((previous) =>
      previous.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task,
      ),
    );
  };

  const handleTaskUpdated = (updated: TaskItem) => {
    setTaskList((previous) =>
      previous.map((task) => (task.id === updated.id ? updated : task)),
    );
    if (selectedTask?.id === updated.id) {
      setSelectedTask(updated);
    }
  };

  const handleDeleted = (taskId: string) => {
    setTaskList((previous) => previous.filter((task) => task.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setDetailOpen(false);
    }
  };

  const handleOpenDetail = (task: TaskItem) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleEdit = (task: TaskItem) => {
    setEditingTask(task);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const capabilities = selectedTask
    ? resolveTaskCapabilities(selectedTask, {
        userId: currentUserId ?? "",
        isAdmin,
        ledDepartmentIds,
        memberDepartmentIds,
      })
    : undefined;

  if (activeCount === 0 && !showEmptyState) {
    return null;
  }

  const isFolio = variant === "folio";

  const rows =
    activeTasks.length > 0 ? (
      <div className="flex flex-col divide-y divide-border/70">
        {activeTasks.map((task) => {
          const deadline = formatTaskDeadline(
            task.deadline,
            task.status === "completed",
          );
          const tone = deadlineTone(
            task.deadline,
            Boolean(deadline?.isOverdue),
          );

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3",
                isFolio ? "min-h-11 py-1.5" : "min-h-[44px] py-1.5",
              )}
            >
              <TaskCheckbox
                taskId={task.id}
                initialStatus={task.status}
                label={task.title}
                className={tone.checkbox}
                onStatusChange={(nextStatus) =>
                  handleStatusChange(task.id, nextStatus)
                }
              />
              <button
                type="button"
                onClick={() => handleOpenDetail(task)}
                aria-label={`Abrir detalhes da tarefa: ${task.title}`}
                className="min-h-11 min-w-0 flex-1 cursor-pointer truncate rounded-sm text-left text-sm font-medium text-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {task.title}
              </button>
              {deadline ? (
                <Badge
                  className={cn(
                    "shrink-0 px-2 py-0.5 text-[11px] font-medium tabular-nums",
                    tone.badge,
                  )}
                >
                  {deadline.isOverdue ? "Atrasada" : deadline.label}
                </Badge>
              ) : null}
            </div>
          );
        })}
      </div>
    ) : null;

  const emptyState = (
    <div className="flex flex-col items-start gap-2">
      <p className="font-heading text-base leading-snug text-foreground">
        Tudo em dia nas tarefas
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Crie um lembrete pessoal quando precisar.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openCreateForm}
        className="mt-1 min-h-11 gap-1.5 lg:min-h-9"
      >
        <PlusIcon className="size-3.5" aria-hidden="true" />
        Nova
      </Button>
    </div>
  );

  return (
    <>
      {isFolio ? (
        <section
          aria-labelledby="home-tasks-title"
          className="flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id="home-tasks-title"
              className="font-heading text-lg leading-tight font-medium tracking-tight whitespace-nowrap text-foreground"
            >
              Minhas tarefas ({activeCount})
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-6 min-h-6 shrink-0 px-1 text-[11px] font-medium text-primary hover:text-primary"
            >
              <Link href="/tasks">
                Ver todas
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {activeTasks.length > 0 ? rows : emptyState}
        </section>
      ) : (
        <HomeSection aria-labelledby="home-tasks-title">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2
                id="home-tasks-title"
                className="font-heading text-lg leading-tight font-medium tracking-tight text-foreground"
              >
                Minhas tarefas
              </h2>
              {activeCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                  {activeCount}
                </span>
              ) : null}
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 min-h-11 shrink-0 px-2 text-xs text-primary hover:text-primary"
            >
              <Link href="/tasks">
                Ver todas
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <HomeCard>
            <HomeCardContent className="space-y-0">
              {activeTasks.length > 0 ? rows : emptyState}
            </HomeCardContent>
          </HomeCard>
        </HomeSection>
      )}

      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onDeleted={handleDeleted}
        onTaskUpdated={handleTaskUpdated}
        capabilities={capabilities}
        members={members}
        departments={departments}
      />

      <TaskFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSuccess={(savedTask) => {
          if (!savedTask) return;
          setTaskList((previous) => {
            const exists = previous.some((task) => task.id === savedTask.id);
            return exists
              ? previous.map((task) =>
                  task.id === savedTask.id ? savedTask : task,
                )
              : [savedTask, ...previous];
          });
          if (selectedTask?.id === savedTask.id) {
            setSelectedTask(savedTask);
          }
        }}
        taskToEdit={editingTask}
        departments={departments}
        members={members}
        currentUserId={currentUserId}
        canDelegateDepartment={ledDepartmentIds.length > 0}
        canDelegateChurch={isAdmin}
      />
    </>
  );
}
