"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDownIcon,
  CheckIcon,
  ExternalLinkIcon,
  HistoryIcon,
  MoreVerticalIcon,
  PinIcon,
  RepeatIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteTaskAction,
  toggleTaskPinAction,
  updateTaskStatusAction,
} from "../actions/tasks.actions";
import {
  formatTaskDeadline,
  formatTaskWhen,
  getPriorityLabel,
} from "../lib/task-utils";
import type { TaskItem } from "../services/tasks-service";

type TasksTableViewProps = {
  tasks: TaskItem[];
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  canManage?: boolean;
};

type SortField = "title" | "date" | "deadline" | "status" | "priority";

export function TasksTableView({
  tasks,
  onEdit,
  onOpenAudit,
  onDelete,
  canManage = true,
}: TasksTableViewProps) {
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Tarefas fixadas sempre no topo
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      if (sortField === "title") {
        return sortAsc
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      if (sortField === "status") {
        return sortAsc
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      if (sortField === "date") {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return sortAsc ? da - db : db - da;
      }
      if (sortField === "deadline") {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return sortAsc ? da - db : db - da;
      }
      return 0;
    });
  }, [tasks, sortField, sortAsc]);

  const handleToggleComplete = async (task: TaskItem) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    const res = await updateTaskStatusAction(task.id, nextStatus);
    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success(
        nextStatus === "completed" ? "Tarefa concluída!" : "Tarefa reaberta.",
      );
    }
  };

  const handleTogglePin = async (taskId: string) => {
    const res = await toggleTaskPinAction(taskId);
    if (!res.ok) {
      toast.error(res.error);
    }
  };

  const handleDelete = async (task: TaskItem) => {
    if (!confirm(`Remover tarefa "${task.title}"?`)) return;
    onDelete?.(task.id);
    const res = await deleteTaskAction(task.id);
    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success("Tarefa removida.");
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-10 text-center">Status</TableHead>
            <TableHead className="w-8"></TableHead>
            <TableHead
              className="cursor-pointer font-semibold text-xs"
              onClick={() => handleSort("title")}
            >
              <div className="flex items-center gap-1">
                <span>Título</span>
                <ArrowUpDownIcon className="size-3 text-muted-foreground" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer font-semibold text-xs"
              onClick={() => handleSort("date")}
            >
              <div className="flex items-center gap-1">
                <span>Quando (Início)</span>
                <ArrowUpDownIcon className="size-3 text-muted-foreground" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer font-semibold text-xs"
              onClick={() => handleSort("deadline")}
            >
              <div className="flex items-center gap-1">
                <span>Prazo Limite</span>
                <ArrowUpDownIcon className="size-3 text-muted-foreground" />
              </div>
            </TableHead>
            <TableHead className="font-semibold text-xs">Prioridade</TableHead>
            <TableHead className="font-semibold text-xs">Responsável</TableHead>
            <TableHead className="font-semibold text-xs">Departamento</TableHead>
            <TableHead className="w-12 text-center">Link</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {sortedTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const whenText = formatTaskWhen(task.date);
            const deadlineInfo = formatTaskDeadline(task.deadline, isCompleted);

            return (
              <TableRow
                key={task.id}
                className={cn(
                  "hover:bg-muted/30 transition-colors",
                  isCompleted && "opacity-70 bg-muted/20",
                )}
              >
                {/* Circular checkbox */}
                <TableCell className="text-center p-2">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    className={cn(
                      "flex size-4 mx-auto items-center justify-center rounded-full border-2 transition-all",
                      isCompleted
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-muted-foreground/50 hover:border-emerald-600",
                    )}
                  >
                    {isCompleted && <CheckIcon className="size-2.5 stroke-[3]" />}
                  </button>
                </TableCell>

                {/* Pin Icon */}
                <TableCell className="p-1 text-center">
                  {task.isPinned && (
                    <PinIcon className="size-3 text-primary fill-primary inline" />
                  )}
                </TableCell>

                {/* Título & Tags */}
                <TableCell className="py-2.5 font-medium min-w-[200px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        onClick={() => onEdit(task)}
                        className={cn(
                          "cursor-pointer hover:underline text-foreground",
                          isCompleted && "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </span>
                      {task.isRecurring && (
                        <span title="Recorrente">
                          <RepeatIcon className="size-3 text-emerald-600 inline" />
                        </span>
                      )}
                    </div>
                    {Array.isArray(task.tags) && task.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {task.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Quando */}
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {whenText ?? "—"}
                </TableCell>

                {/* Prazo */}
                <TableCell className="whitespace-nowrap">
                  {deadlineInfo ? (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-medium",
                        deadlineInfo.isOverdue
                          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {deadlineInfo.label}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Prioridade */}
                <TableCell className="whitespace-nowrap">
                  {task.priority !== "none" ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase",
                        task.priority === "high" && "border-red-500 text-red-600",
                        task.priority === "medium" && "border-amber-500 text-amber-600",
                        task.priority === "low" && "border-blue-500 text-blue-600",
                      )}
                    >
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Responsável */}
                <TableCell className="whitespace-nowrap">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5 border">
                        {task.assignee.image ? (
                          <AvatarImage src={task.assignee.image} alt={task.assignee.name ?? ""} />
                        ) : null}
                        <AvatarFallback className="text-[9px]">
                          {task.assignee.name ? getInitials(task.assignee.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[120px]">
                        {task.assignee.name ?? "Membro"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Departamento */}
                <TableCell className="whitespace-nowrap">
                  {task.department ? (
                    <span className="font-medium text-primary">
                      {task.department.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Pessoal</span>
                  )}
                </TableCell>

                {/* URL */}
                <TableCell className="text-center p-2">
                  {task.url ? (
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground inline-flex"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  ) : null}
                </TableCell>

                {/* Ações */}
                <TableCell className="text-right p-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreVerticalIcon className="size-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePin(task.id)}>
                        {task.isPinned ? "Desafixar" : "Fixar no topo"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenAudit(task)}>
                        <HistoryIcon className="mr-2 size-3.5" />
                        Auditoria
                      </DropdownMenuItem>
                      {canManage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(task)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2Icon className="mr-2 size-3.5" />
                            Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
