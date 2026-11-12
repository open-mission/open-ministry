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
  HistoryIcon,
  MoreVerticalIcon,
  PinIcon,
  RepeatIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteTaskAction,
  toggleTaskPinAction,
  updateTaskStatusAction,
} from "../actions/tasks.actions";
import { formatTaskDeadline, formatTaskWhen } from "../lib/task-utils";
import type { TaskItem } from "../services/tasks-service";

type TaskRowProps = {
  task: TaskItem;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  canManage?: boolean;
};

export function TaskRow({
  task,
  onEdit,
  onOpenAudit,
  canManage = true,
}: TaskRowProps) {
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
      } else {
        toast.success(
          nextCompleted ? "Tarefa concluída! Parabéns!" : "Tarefa reaberta.",
        );
      }
    });
  };

  const handleTogglePin = () => {
    startTransition(async () => {
      const res = await toggleTaskPinAction(task.id);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(res.data.isPinned ? "Tarefa fixada no topo." : "Tarefa desafixada.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Deseja realmente remover a tarefa "${task.title}"?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteTaskAction(task.id);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Tarefa removida com sucesso.");
      }
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-2xs transition-all hover:border-border hover:shadow-xs",
        isDragging && "z-50 opacity-60 shadow-lg border-primary",
        isCompleted && "bg-muted/30 opacity-75",
        task.isPinned && "border-l-4 border-l-primary",
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Drag Handle */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Reordenar tarefa"
          className="cursor-grab touch-none p-0.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
        >
          <GripVerticalIcon className="size-4" />
        </button>

        {/* Circular Checkbox (Things 3 style) */}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={isPending}
          aria-label={isCompleted ? "Reabrir tarefa" : "Concluir tarefa"}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
            isCompleted
              ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
              : "border-muted-foreground/50 hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
          )}
        >
          {isCompleted && <CheckIcon className="size-3 stroke-[3]" />}
        </button>

        {/* Informações Centrais */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              onClick={() => onEdit(task)}
              className={cn(
                "text-sm font-medium text-foreground cursor-pointer hover:underline truncate",
                isCompleted && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </span>

            {task.isPinned && (
              <span title="Tarefa fixada">
                <PinIcon className="size-3 text-primary fill-primary" />
              </span>
            )}

            {task.isRecurring && (
              <span title="Tarefa recorrente">
                <RepeatIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
              </span>
            )}
          </div>

          {/* Badges e Metadados */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            {/* Data: Quando */}
            {whenText && (
              <span className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground/80">
                <CalendarDaysIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
                {whenText}
              </span>
            )}

            {/* Deadline */}
            {deadlineInfo && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
                  deadlineInfo.isOverdue
                    ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-semibold"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                )}
              >
                <ClockIcon className="size-3" />
                {deadlineInfo.isOverdue ? `Atrasado: ${deadlineInfo.label}` : `Prazo: ${deadlineInfo.label}`}
              </span>
            )}

            {/* Departamento */}
            {task.department && (
              <span className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px]">
                <UsersIcon className="size-3 text-primary" />
                {task.department.name}
              </span>
            )}

            {/* Tags */}
            {Array.isArray(task.tags) && task.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lado Direito: Assignee, Link e Ações */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Link Externo */}
        {task.url && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir link de referência"
            className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ExternalLinkIcon className="size-3.5" />
          </a>
        )}

        {/* Responsável Avatar */}
        {task.assignee ? (
          <Avatar className="size-6 border shadow-2xs" title={`Responsável: ${task.assignee.name ?? "Membro"}`}>
            {task.assignee.image ? (
              <AvatarImage src={task.assignee.image} alt={task.assignee.name ?? "Assignee"} />
            ) : null}
            <AvatarFallback className="text-[10px] font-medium">
              {task.assignee.name ? getInitials(task.assignee.name) : "?"}
            </AvatarFallback>
          </Avatar>
        ) : null}

        {/* Menu de Ações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
            >
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              Editar Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleTogglePin}>
              {task.isPinned ? "Desafixar do topo" : "Fixar no topo"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenAudit(task)}>
              <HistoryIcon className="mr-2 size-3.5" />
              Ver Auditoria
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2Icon className="mr-2 size-3.5" />
                  Excluir Tarefa
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
