"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BellRingIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  PinIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateTaskStatusAction } from "../actions/tasks.actions";
import type { TaskCapabilities } from "../lib/task-permissions";
import {
  formatTaskDeadline,
  formatTaskWhen,
  getPriorityLabel,
  getStatusLabel,
} from "../lib/task-utils";
import type { TaskItem, TaskStatus } from "../services/tasks-service";
import { TaskActionsMenu } from "./task-actions-menu";

type TaskRowProps = {
  task: TaskItem;
  childTasks?: TaskItem[];
  capabilities?: TaskCapabilities;
  childCapabilitiesMap?: Record<string, TaskCapabilities>;
  onView: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdated?: (updated: TaskItem) => void;
  isSortable?: boolean;
  canManage?: boolean;
};

export function TaskRow({
  task,
  childTasks = [],
  capabilities,
  childCapabilitiesMap = {},
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  isSortable = false,
  canManage = true,
}: TaskRowProps) {
  const [isPending, startTransition] = useTransition();
  const [expandedGroup, setExpandedGroup] = useState(false);

  const canUpdateStatus = capabilities?.canUpdateStatus ?? canManage;
  const canReorder = isSortable && (capabilities?.canReorder ?? canManage);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !canReorder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.status === "completed";
  const isCanceled = task.status === "canceled";
  const whenLabel = formatTaskWhen(task.date);
  const deadlineInfo = formatTaskDeadline(task.deadline, isCompleted);

  const completedChildrenCount = childTasks.filter(
    (c) => c.status === "completed",
  ).length;
  const hasGroupChildren = childTasks.length > 0;

  const handleToggleComplete = (targetTask: TaskItem) => {
    const nextStatus: TaskStatus =
      targetTask.status === "completed" ? "todo" : "completed";
    const optimistic: TaskItem = {
      ...targetTask,
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date() : null,
    };
    onTaskUpdated?.(optimistic);

    startTransition(async () => {
      const res = await updateTaskStatusAction(targetTask.id, nextStatus);
      if (res.ok) {
        if (res.data.task) {
          onTaskUpdated?.(res.data.task);
        }
        toast.success(
          nextStatus === "completed"
            ? "Tarefa concluída!"
            : "Tarefa marcada como a fazer.",
        );
      } else {
        onTaskUpdated?.(targetTask);
        toast.error(res.error);
      }
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-card transition-colors",
        task.isPinned && "border-primary/25 bg-primary/[0.03]",
        isDragging && "z-50 opacity-85 shadow-lg ring-2 ring-primary/20",
        (isCompleted || isCanceled) && "bg-muted/30 opacity-80",
      )}
    >
      <div className="flex items-start gap-2.5 p-3 sm:items-center sm:px-3.5 sm:py-3">
        {/* Handle dedicado para arrastar sem bloquear cliques ou teclado na linha */}
        {canReorder ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reordenar tarefa ${task.title}`}
            className="mt-0.5 flex size-9 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground/60 touch-none hover:bg-muted hover:text-foreground active:cursor-grabbing sm:mt-0 sm:size-7"
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}

        {/* Checkbox com área de toque confortável */}
        <button
          type="button"
          onClick={() => handleToggleComplete(task)}
          disabled={isPending || !canUpdateStatus}
          aria-label={
            isCompleted
              ? `Reabrir tarefa ${task.title}`
              : `Concluir tarefa ${task.title}`
          }
          className={cn(
            "-my-1 -ml-1 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:m-0 sm:size-8",
            !canUpdateStatus && "cursor-not-allowed opacity-40",
          )}
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
              isCompleted
                ? "border-primary bg-primary text-primary-foreground"
                : task.priority === "high"
                  ? "border-destructive/60 bg-background hover:border-destructive"
                  : task.priority === "medium"
                    ? "border-amber-500/70 bg-background hover:border-amber-600"
                    : "border-muted-foreground/40 bg-background hover:border-primary",
            )}
          >
            {isCompleted ? <CheckIcon className="size-3.5 stroke-[3]" /> : null}
          </span>
        </button>

        {/* Área clicável semântica de título + metadados */}
        <button
          type="button"
          onClick={() => onView(task)}
          className="flex min-w-0 flex-1 flex-col gap-1 rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {task.isPinned ? (
              <PinIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 fill-primary/20 text-primary"
              />
            ) : null}

            <span
              className={cn(
                "text-sm font-medium leading-snug text-foreground",
                isCompleted && "line-through text-muted-foreground",
                isCanceled && "text-muted-foreground",
              )}
            >
              {task.title}
            </span>

            {task.status === "in_progress" ? (
              <Badge
                variant="outline"
                className="h-5 border-amber-500/30 bg-amber-500/10 px-1.5 text-xs font-normal text-amber-700 dark:text-amber-400"
              >
                Em Andamento
              </Badge>
            ) : null}

            {isCanceled ? (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-xs font-normal text-muted-foreground"
              >
                Cancelada
              </Badge>
            ) : null}

            {task.priority && task.priority !== "none" ? (
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-xs font-normal",
                  task.priority === "high"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : task.priority === "medium"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground",
                )}
              >
                {getPriorityLabel(task.priority)}
              </Badge>
            ) : null}

            {task.isRecurring ? (
              <BellRingIcon
                aria-label="Tarefa com lembrete semanal"
                className="size-3.5 text-primary/80"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {whenLabel ? (
              <span className="inline-flex items-center gap-1 font-medium text-primary/90">
                <CalendarIcon className="size-3.5" />
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
                <ClockIcon className="size-3.5" />
                {deadlineInfo.label}
              </span>
            ) : null}

            {task.scope === "organization" ? (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-xs font-normal"
              >
                Toda a igreja
              </Badge>
            ) : null}

            {task.department ? (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-xs font-normal"
              >
                {task.department.name}
              </Badge>
            ) : null}

            {task.assignee ? (
              <span className="truncate">
                Responsável:{" "}
                <strong className="font-medium text-foreground">
                  {task.assignee.name ?? "Membro"}
                </strong>
              </span>
            ) : null}

            {hasGroupChildren ? (
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <UsersIcon className="size-3.5" />
                {completedChildrenCount} de {childTasks.length} concluíram
              </span>
            ) : null}

            {task.tags && task.tags.length > 0 ? (
              <span className="hidden items-center gap-1 sm:inline-flex">
                {task.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="h-5 border-border/70 px-1.5 text-xs font-normal text-muted-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
                {task.tags.length > 2 ? (
                  <span className="text-xs">+{task.tags.length - 2}</span>
                ) : null}
              </span>
            ) : null}
          </div>
        </button>

        {/* Controles laterais irmãos (nunca aninhados no botão principal) */}
        <div className="flex shrink-0 items-center gap-1">
          {hasGroupChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={expandedGroup}
              onClick={() => setExpandedGroup((v) => !v)}
              className="min-h-[36px] gap-1 px-2 text-xs text-primary"
            >
              <span className="hidden sm:inline">Equipe</span>
              <ChevronDownIcon
                className={cn(
                  "size-4 transition-transform",
                  expandedGroup && "rotate-180",
                )}
              />
            </Button>
          ) : null}

          {task.url ? (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir link de apoio de ${task.title}`}
              className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary sm:size-8"
            >
              <ExternalLinkIcon className="size-4" />
            </a>
          ) : null}

          <TaskActionsMenu
            task={task}
            capabilities={capabilities}
            onView={onView}
            onEdit={onEdit}
            onOpenAudit={onOpenAudit}
            onDelete={onDelete}
            onTaskUpdated={onTaskUpdated}
            canManage={canManage}
          />
        </div>
      </div>

      {/* Lista expandida de membros para delegação individual */}
      {hasGroupChildren && expandedGroup ? (
        <div className="border-t bg-muted/20 px-4 py-2.5 space-y-1.5 rounded-b-xl">
          <p className="text-xs font-medium text-muted-foreground">
            Andamento individual da equipe ({completedChildrenCount}/{childTasks.length})
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {childTasks.map((child) => {
              const childDone = child.status === "completed";
              const childCap = childCapabilitiesMap[child.id];
              const canToggleChild =
                childCap?.canUpdateStatus ?? canUpdateStatus;
              const memberLabel =
                child.assignee?.name ??
                child.assigneePerson?.name ??
                "Membro sem vínculo";

              return (
                <div
                  key={child.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs"
                >
                  <button
                    type="button"
                    disabled={!canToggleChild || isPending}
                    onClick={() => handleToggleComplete(child)}
                    aria-label={
                      childDone
                        ? `Reabrir tarefa de ${memberLabel}`
                        : `Concluir tarefa de ${memberLabel}`
                    }
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        childDone
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {childDone ? (
                        <CheckIcon className="size-2.5 stroke-[3]" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "truncate font-medium",
                        childDone && "line-through text-muted-foreground",
                      )}
                    >
                      {memberLabel}
                    </span>
                  </button>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {getStatusLabel(child.status)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
