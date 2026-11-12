"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  CheckSquare2Icon,
  ChevronRightIcon,
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
import { formatTaskDeadline } from "../lib/task-utils";
import type { TaskItem, TaskStatus } from "../services/tasks-service";
import { TaskAuditHistoryDialog } from "./task-audit-history-dialog";
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
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [, startTransition] = useTransition();

  // Modais de detalhe, formulário e auditoria
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [auditTask, setAuditTask] = useState<TaskItem | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  // Filtra as tarefas ativas para contagem e exibição prioritária
  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "canceled");
  const visibleTasks = activeTasks.slice(0, limit);

  const handleToggleComplete = (task: TaskItem) => {
    const isCompleted = task.status === "completed";
    const nextStatus: TaskStatus = isCompleted ? "todo" : "completed";

    const updatedTask: TaskItem = {
      ...task,
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date() : null,
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? updatedTask : t)),
    );

    if (selectedTask?.id === task.id) {
      setSelectedTask(updatedTask);
    }

    startTransition(async () => {
      const res = await updateTaskStatusAction(task.id, nextStatus);
      if (!res.ok) {
        toast.error(res.error || "Erro ao atualizar status da tarefa");
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? task : t)),
        );
        return;
      }
      toast.success(
        nextStatus === "completed"
          ? "Tarefa concluída com sucesso!"
          : "Tarefa reaberta!",
      );
    });
  };

  const handleOpenDetail = (task: TaskItem) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleOpenAudit = (task: TaskItem) => {
    setAuditTask(task);
    setAuditOpen(true);
  };

  const handleTaskUpdated = (updated: TaskItem) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
    if (selectedTask?.id === updated.id) {
      setSelectedTask(updated);
    }
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setDetailOpen(false);
    }
  };

  const handleTaskCreated = (newTask: TaskItem) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  return (
    <>
      <Card className={cn("overflow-hidden border-border/70 bg-card", className)}>
        <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckSquare2Icon className="size-4" aria-hidden="true" />
              </span>
              <CardTitle className="font-heading text-lg tracking-tight sm:text-xl">
                Minhas Tarefas
              </CardTitle>
              {activeTasks.length > 0 && (
                <Badge variant="secondary" className="text-[11px] font-semibold h-5 px-2">
                  {activeTasks.length} {activeTasks.length === 1 ? "pendente" : "pendentes"}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Seus afazeres pessoais, rotinas e demandas ministeriais.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={handleCreateNew}
            >
              <PlusIcon className="size-3.5" />
              <span>Nova tarefa</span>
            </Button>

            <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <Link href="/dashboard/tasks" prefetch={true}>
                <span>Ver todas</span>
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border/60">
          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-10 px-4 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Tudo em dia!
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Você não possui nenhuma tarefa pendente no momento.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-8 text-xs gap-1.5"
                onClick={handleCreateNew}
              >
                <PlusIcon className="size-3.5" />
                Criar nova tarefa
              </Button>
            </div>
          ) : (
            visibleTasks.map((task) => {
              const isCompleted = task.status === "completed";
              const deadlineInfo = formatTaskDeadline(task.deadline, isCompleted);

              return (
                <div
                  key={task.id}
                  className="group flex items-center justify-between gap-3 px-4 py-3 sm:px-5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Botão de Checkbox Circular */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(task);
                      }}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isCompleted
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-muted-foreground/40 hover:border-primary hover:bg-primary/5",
                      )}
                      title={isCompleted ? "Reabrir tarefa" : "Concluir tarefa"}
                      aria-label={isCompleted ? "Reabrir tarefa" : "Concluir tarefa"}
                    >
                      {isCompleted && <CheckIcon className="size-3 stroke-[3]" />}
                    </button>

                    {/* Título e Metadados clicáveis para abrir detalhes */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(task)}
                      className="text-left min-w-0 flex-1 group/title"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p
                          className={cn(
                            "text-sm font-medium text-foreground group-hover/title:text-primary transition-colors line-clamp-1 break-words",
                            isCompleted && "line-through text-muted-foreground",
                          )}
                        >
                          {task.title}
                        </p>

                        {task.isPinned && (
                          <PinIcon className="size-3 text-primary fill-primary shrink-0" />
                        )}
                      </div>

                      {/* Chips de Metadados: Prazo, Departamento e Prioridade */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        {deadlineInfo && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-medium",
                              deadlineInfo.isOverdue
                                ? "text-destructive font-semibold"
                                : "text-muted-foreground",
                            )}
                          >
                            <ClockIcon className="size-3" />
                            {deadlineInfo.label}
                          </span>
                        )}

                        {task.scope === "department" && task.department && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
                            {task.department.name}
                          </span>
                        )}

                        {task.priority === "high" && (
                          <span className="rounded bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-medium">
                            Alta prioridade
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Seta para abrir detalhes */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground/60 hover:text-foreground shrink-0 rounded-md"
                    onClick={() => handleOpenDetail(task)}
                    title="Ver detalhes da tarefa"
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              );
            })
          )}

          {activeTasks.length > limit && (
            <div className="p-2.5 bg-muted/20 text-center border-t border-border/60">
              <Link
                href="/dashboard/tasks"
                prefetch={true}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>
                  Ver mais {activeTasks.length - limit}{" "}
                  {activeTasks.length - limit === 1 ? "tarefa" : "tarefas"}
                </span>
                <ArrowRightIcon className="size-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Tarefa (Distilled View) */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(task) => {
          setDetailOpen(false);
          handleOpenEdit(task);
        }}
        onOpenAudit={(task) => {
          handleOpenAudit(task);
        }}
        onDelete={handleTaskDeleted}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Modal de Criação / Edição de Tarefas */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        taskToEdit={editingTask}
        departments={departments}
        members={people}
        currentUserId={currentUserId}
        canDelegateDepartment={canDelegateDepartment}
        canDelegateChurch={canDelegateChurch}
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Modal de Histórico de Auditoria */}
      <TaskAuditHistoryDialog
        task={auditTask}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </>
  );
}
