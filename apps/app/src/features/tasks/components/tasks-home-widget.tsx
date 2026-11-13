"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CheckSquareIcon,
  ClockIcon,
  PinIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { updateTaskStatusAction } from "../actions/tasks.actions";
import { resolveTaskCapabilities } from "../lib/task-permissions";
import { formatTaskDeadline, formatTaskWhen } from "../lib/task-utils";
import type { TaskItem, TaskStatus } from "../services/tasks-service";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TaskFormDialog } from "./task-form-dialog";

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

type TasksHomeWidgetProps = {
  initialTasks: TaskItem[];
  departments?: DepartmentOption[];
  people?: MemberOption[];
  currentUserId?: string;
  canDelegateDepartment?: boolean;
  canDelegateChurch?: boolean;
  limit?: number;
  className?: string;
};

export function TasksHomeWidget({
  initialTasks,
  departments = [],
  people = [],
  currentUserId,
  canDelegateDepartment = false,
  canDelegateChurch = false,
  limit = 5,
  className,
}: TasksHomeWidgetProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [, startTransition] = useTransition();

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const activeTasks = tasks
    .filter((t) => t.status === "todo" || t.status === "in_progress")
    .slice(0, limit);

  const totalPending = tasks.filter(
    (t) => t.status === "todo" || t.status === "in_progress",
  ).length;

  const handleToggle = (task: TaskItem) => {
    const nextStatus: TaskStatus =
      task.status === "completed" ? "todo" : "completed";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );

    startTransition(async () => {
      const res = await updateTaskStatusAction(task.id, nextStatus);
      if (res.ok) {
        if (res.data.task) {
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? res.data.task! : t)),
          );
        }
        toast.success(
          nextStatus === "completed" ? "Tarefa concluída!" : "Tarefa reaberta.",
        );
      } else {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        toast.error(res.error);
      }
    });
  };

  const handleOpenDetail = (task: TaskItem) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleEdit = (task: TaskItem) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleTaskUpdated = (updated: TaskItem) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTask?.id === updated.id) {
      setSelectedTask(updated);
    }
  };

  const handleDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const computeCaps = (task: TaskItem) =>
    currentUserId
      ? resolveTaskCapabilities(task, {
          userId: currentUserId,
          isAdmin: canDelegateChurch,
          ledDepartmentIds: canDelegateDepartment
            ? departments.map((d) => d.id)
            : [],
          memberDepartmentIds: departments.map((d) => d.id),
          canCreateOrganization: canDelegateChurch,
        })
      : undefined;

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden border-border/70 bg-card/80 shadow-xs",
          className,
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-semibold">
              <CheckSquareIcon className="size-4.5 text-primary" />
              Minhas Tarefas
              {totalPending > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-xs font-semibold"
                >
                  {totalPending}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription className="text-xs">
              Afazeres pessoais e demandas atribuídas a você.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingTask(null);
              setFormOpen(true);
            }}
            className="min-h-[36px] shrink-0 gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            Nova
          </Button>
        </CardHeader>

        <CardContent className="space-y-2 pb-4">
          {activeTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 py-7 px-4 text-center">
              <CheckSquareIcon className="mb-2 size-7 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">
                Tudo em dia!
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Você não tem tarefas pendentes no momento.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTask(null);
                  setFormOpen(true);
                }}
                className="mt-3 min-h-[36px] gap-1.5 text-xs"
              >
                <PlusIcon className="size-3.5" />
                Adicionar tarefa
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeTasks.map((task) => {
                const isDone = task.status === "completed";
                const whenLabel = formatTaskWhen(task.date);
                const deadlineInfo = formatTaskDeadline(task.deadline, isDone);

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border bg-background p-2.5 transition-colors hover:border-border/80",
                      task.isPinned && "border-primary/25 bg-primary/[0.03]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(task)}
                      aria-label={
                        isDone
                          ? `Reabrir tarefa ${task.title}`
                          : `Concluir tarefa ${task.title}`
                      }
                      className="-my-1 -ml-1 flex size-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:m-0 sm:size-7"
                    >
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
                          isDone
                            ? "border-primary bg-primary text-primary-foreground"
                            : task.priority === "high"
                              ? "border-destructive/60 bg-background hover:border-destructive"
                              : "border-muted-foreground/40 bg-background hover:border-primary",
                        )}
                      >
                        {isDone ? (
                          <CheckIcon className="size-3 stroke-[3]" />
                        ) : null}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(task)}
                      className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-1.5">
                        {task.isPinned ? (
                          <PinIcon
                            aria-hidden="true"
                            className="size-3.5 shrink-0 fill-primary/20 text-primary"
                          />
                        ) : null}
                        <span
                          className={cn(
                            "truncate text-sm font-medium text-foreground",
                            isDone && "line-through text-muted-foreground",
                          )}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {whenLabel ? (
                          <span className="inline-flex items-center gap-1 font-medium text-primary/90">
                            <CalendarIcon className="size-3" />
                            {whenLabel}
                          </span>
                        ) : null}
                        {deadlineInfo ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-medium",
                              deadlineInfo.isOverdue && "text-destructive",
                            )}
                          >
                            <ClockIcon className="size-3" />
                            {deadlineInfo.label}
                          </span>
                        ) : null}
                        {task.department ? (
                          <Badge
                            variant="secondary"
                            className="h-5 px-1.5 text-xs font-normal"
                          >
                            {task.department.name}
                          </Badge>
                        ) : task.scope === "organization" ? (
                          <Badge
                            variant="secondary"
                            className="h-5 px-1.5 text-xs font-normal"
                          >
                            Toda a igreja
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  </div>
                );
              })}

              <div className="pt-1.5 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8 gap-1 text-xs text-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Link href="/dashboard/tasks">
                    Ver todas as tarefas
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onDeleted={handleDeleted}
        onTaskUpdated={handleTaskUpdated}
        capabilities={selectedTask ? computeCaps(selectedTask) : undefined}
        members={people}
        departments={departments}
      />

      <TaskFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSuccess={(savedTask, count) => {
          if (savedTask) {
            setTasks((prev) => {
              const exists = prev.some((t) => t.id === savedTask.id);
              return exists
                ? prev.map((t) => (t.id === savedTask.id ? savedTask : t))
                : [savedTask, ...prev];
            });
          }
          if ((count ?? 1) > 1 || !savedTask) {
            router.refresh();
          }
        }}
        taskToEdit={editingTask}
        departments={departments}
        members={people}
        currentUserId={currentUserId}
        canDelegateDepartment={canDelegateDepartment}
        canDelegateChurch={canDelegateChurch}
      />
    </>
  );
}
