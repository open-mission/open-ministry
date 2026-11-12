"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  PinIcon,
  RepeatIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  updateTaskStatusAction,
} from "../actions/tasks.actions";
import {
  formatTaskDeadline,
  formatTaskWhen,
  getPriorityLabel,
} from "../lib/task-utils";
import { TaskActionsMenu } from "./task-actions-menu";
import type { TaskItem, TaskPriority } from "../services/tasks-service";

type TaskCardProps = {
  task: TaskItem;
  onView: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  canManage?: boolean;
};

export function TaskCard({
  task,
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  canManage = true,
}: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticCompleted, setOptimisticCompleted] = useState(
    task.status === "completed",
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = optimisticCompleted;
  const whenText = formatTaskWhen(task.date);
  const deadlineInfo = formatTaskDeadline(task.deadline, isCompleted);

  const handleToggleComplete = () => {
    const nextCompleted = !isCompleted;
    setOptimisticCompleted(nextCompleted);

    startTransition(async () => {
      const nextStatus = nextCompleted ? "completed" : "todo";
      const res = await updateTaskStatusAction(task.id, nextStatus);
      if (!res.ok) {
        setOptimisticCompleted(!nextCompleted);
        toast.error(res.error);
      }
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onView(task)}
      className={cn(
        "group relative flex flex-col justify-between gap-2.5 rounded-xl border border-border/70 bg-card p-3 shadow-2xs transition-all hover:border-border hover:shadow-xs cursor-pointer",
        isDragging && "z-50 opacity-50 shadow-xl border-primary",
        isCompleted && "bg-muted/30 opacity-70",
        task.isPinned && "border-t-2 border-t-primary",
      )}
    >
      {/* Top Header: Drag handle, Checkbox, Title & Menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            type="button"
            aria-label="Arrastar card"
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab touch-none p-0.5 text-muted-foreground/40 hover:text-foreground mt-0.5"
          >
            <GripVerticalIcon className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleComplete();
            }}
            disabled={isPending}
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all mt-0.5",
              isCompleted
                ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                : "border-muted-foreground/50 hover:border-emerald-600",
            )}
          >
            {isCompleted && <CheckIcon className="size-2.5 stroke-[3]" />}
          </button>

          <div className="min-w-0 flex-1">
            <h4
              className={cn(
                "text-xs font-semibold text-foreground transition-colors group-hover:text-primary line-clamp-2",
                isCompleted && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {task.isPinned && (
            <PinIcon className="size-3 text-primary fill-primary" />
          )}

          {task.isRecurring && (
            <RepeatIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
          )}

          <TaskActionsMenu
            task={task}
            onView={onView}
            onEdit={onEdit}
            onOpenAudit={onOpenAudit}
            onDelete={onDelete}
            canManage={canManage}
            triggerClassName="size-6 text-muted-foreground hover:text-foreground"
          />
        </div>
      </div>

      {/* Descrição curta */}
      {task.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Metadados / Datas / Badges */}
      <div className="space-y-1.5 pt-1 border-t border-border/40">
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          {whenText && (
            <span className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-foreground/80 font-medium">
              <CalendarDaysIcon className="size-2.5 text-emerald-600 dark:text-emerald-400" />
              {whenText}
            </span>
          )}

          {deadlineInfo && (
            <span
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 font-medium",
                deadlineInfo.isOverdue
                  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-semibold"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
              )}
            >
              <ClockIcon className="size-2.5" />
              {deadlineInfo.isOverdue ? `Atrasado: ${deadlineInfo.label}` : deadlineInfo.label}
            </span>
          )}

          {task.priority !== "none" && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-medium",
                task.priority === "high"
                  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  : task.priority === "medium"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
              )}
            >
              {getPriorityLabel(task.priority as TaskPriority)}
            </span>
          )}
        </div>

        {/* Rodapé do card: Tags, Dept, Assignee e Link */}
        <div className="flex items-center justify-between gap-1 pt-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            {task.department && (
              <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-primary font-medium truncate">
                <UsersIcon className="size-2.5" />
                {task.department.name}
              </span>
            )}

            {Array.isArray(task.tags) && task.tags.length > 0 && (
              <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                #{task.tags[0]}
                {task.tags.length > 1 ? ` +${task.tags.length - 1}` : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {task.url && (
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Abrir link"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLinkIcon className="size-3" />
              </a>
            )}

            {task.assignee ? (
              <Avatar className="size-5 border shadow-2xs" title={task.assignee.name ?? "Responsável"}>
                {task.assignee.image ? (
                  <AvatarImage src={task.assignee.image} alt={task.assignee.name ?? "Assignee"} />
                ) : null}
                <AvatarFallback className="text-[9px]">
                  {task.assignee.name ? getInitials(task.assignee.name) : "?"}
                </AvatarFallback>
              </Avatar>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
