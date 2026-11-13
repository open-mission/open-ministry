"use client";

import { useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BellRingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  PinIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateTaskStatusAction } from "../actions/tasks.actions";
import type { TaskCapabilities } from "../lib/task-permissions";
import {
  formatTaskDeadline,
  formatTaskWhen,
  getPriorityLabel,
} from "../lib/task-utils";
import type { TaskItem, TaskStatus } from "../services/tasks-service";
import { TaskActionsMenu } from "./task-actions-menu";

type TaskCardProps = {
  task: TaskItem;
  capabilities?: TaskCapabilities;
  onView: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdated?: (updated: TaskItem) => void;
  canManage?: boolean;
};

export function TaskCard({
  task,
  capabilities,
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  canManage = true,
}: TaskCardProps) {
  const [isPending, startTransition] = useTransition();

  const canUpdateStatus = capabilities?.canUpdateStatus ?? canManage;
  const canReorder = capabilities?.canReorder ?? canManage;

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

  const handleToggle = () => {
    const nextStatus: TaskStatus = isCompleted ? "todo" : "completed";
    onTaskUpdated?.({
      ...task,
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date() : null,
    });

    startTransition(async () => {
      const res = await updateTaskStatusAction(task.id, nextStatus);
      if (res.ok) {
        if (res.data.task) {
          onTaskUpdated?.(res.data.task);
        }
        toast.success(
          nextStatus === "completed" ? "Tarefa concluída!" : "Tarefa reaberta.",
        );
      } else {
        onTaskUpdated?.(task);
        toast.error(res.error);
      }
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-xl border bg-card p-3.5 shadow-2xs transition-colors hover:border-border/80",
        task.isPinned && "border-primary/30 bg-primary/[0.03]",
        isDragging && "z-50 opacity-85 shadow-lg ring-2 ring-primary/20",
        (isCompleted || isCanceled) && "bg-muted/35 opacity-80",
      )}
    >
      {/* Topo: Handle + Checkbox + Título + Menu */}
      <div className="flex items-start gap-2">
        {canReorder ? (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Mover cartão ${task.title}`}
            className="mt-0.5 flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/60 touch-none hover:bg-muted hover:text-foreground active:cursor-grabbing"
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending || !canUpdateStatus}
          aria-label={
            isCompleted
              ? `Reabrir tarefa ${task.title}`
              : `Concluir tarefa ${task.title}`
          }
          className={cn(
            "-my-1 -ml-1 flex size-9 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:m-0 sm:size-6",
            !canUpdateStatus && "cursor-not-allowed opacity-40",
          )}
        >
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-full border-2 transition-colors",
              isCompleted
                ? "border-primary bg-primary text-primary-foreground"
                : task.priority === "high"
                  ? "border-destructive/70 bg-background hover:border-destructive"
                  : "border-muted-foreground/40 bg-background hover:border-primary",
            )}
          >
            {isCompleted ? <CheckIcon className="size-2.5 stroke-[3]" /> : null}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onView(task)}
          className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span
            className={cn(
              "block text-sm font-medium leading-snug line-clamp-2",
              isCompleted && "line-through text-muted-foreground",
              isCanceled && "text-muted-foreground",
            )}
          >
            {task.title}
          </span>
        </button>

        <div className="-mt-1 -mr-1 shrink-0">
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

      {/* Descrição resumida */}
      {task.description ? (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      ) : null}

      {/* Datas, prioridade e fixado */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {task.isPinned ? (
          <Badge
            variant="outline"
            className="h-5 gap-1 border-primary/30 px-1.5 text-xs text-primary"
          >
            <PinIcon className="size-3" />
            Fixada
          </Badge>
        ) : null}

        {whenLabel ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
            <CalendarIcon className="size-3" />
            {whenLabel}
          </span>
        ) : null}

        {deadlineInfo ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium",
              deadlineInfo.isOverdue
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ClockIcon className="size-3" />
            {deadlineInfo.label}
          </span>
        ) : null}

        {task.priority && task.priority !== "none" ? (
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-1.5 text-xs font-normal",
              task.priority === "high"
                ? "border-destructive/30 text-destructive"
                : task.priority === "medium"
                  ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            {getPriorityLabel(task.priority)}
          </Badge>
        ) : null}

        {task.isRecurring ? (
          <BellRingIcon
            aria-label="Tarefa recorrente"
            className="ml-auto size-3.5 text-primary/70"
          />
        ) : null}
      </div>

      {/* Rodapé: Escopo, Tags, Responsável e Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
        <div className="flex flex-wrap items-center gap-1">
          {task.scope === "organization" ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
              Toda a igreja
            </Badge>
          ) : null}

          {task.department ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
              {task.department.name}
            </Badge>
          ) : null}

          {task.tags?.slice(0, 2).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="h-5 border-border/70 px-1.5 text-xs font-normal text-muted-foreground"
            >
              {t}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {task.url ? (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir link de apoio de ${task.title}`}
              className="flex size-7 items-center justify-center rounded text-muted-foreground hover:text-primary"
            >
              <ExternalLinkIcon className="size-3.5" />
            </a>
          ) : null}

          {task.assignee ? (
            <div
              title={task.assignee.name ?? "Responsável"}
              className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-border"
            >
              {task.assignee.name?.[0]?.toUpperCase() ?? "M"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
