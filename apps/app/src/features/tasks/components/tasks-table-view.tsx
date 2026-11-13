"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ExternalLinkIcon,
  PinIcon,
  RepeatIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { TaskRow } from "./task-row";

type TasksTableViewProps = {
  tasks: TaskItem[];
  capabilitiesByTaskId?: Record<string, TaskCapabilities>;
  onView: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdated?: (updated: TaskItem) => void;
  canManage?: boolean;
};

type SortField = "title" | "date" | "deadline" | "status" | "priority";
type SortDirection = "asc" | "desc";

const PRIORITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

const STATUS_WEIGHT: Record<string, number> = {
  todo: 1,
  in_progress: 2,
  completed: 3,
  canceled: 4,
};

const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

export function TasksTableView({
  tasks,
  capabilitiesByTaskId = {},
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  canManage = true,
}: TasksTableViewProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isPending, startTransition] = useTransition();

  // Agrupa filhas individuais sob o pai quando o pai estiver na lista
  const { topLevelTasks, childrenByParentId } = useMemo(() => {
    const taskIds = new Set(tasks.map((t) => t.id));
    const childrenMap = new Map<string, TaskItem[]>();
    const topLevel: TaskItem[] = [];

    for (const task of tasks) {
      if (task.parentTaskId && taskIds.has(task.parentTaskId)) {
        const list = childrenMap.get(task.parentTaskId) ?? [];
        list.push(task);
        childrenMap.set(task.parentTaskId, list);
      } else {
        topLevel.push(task);
      }
    }
    return { topLevelTasks: topLevel, childrenByParentId: childrenMap };
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    if (!sortField) return topLevelTasks;
    const copy = [...topLevelTasks];
    const factor = sortDirection === "asc" ? 1 : -1;

    copy.sort((a, b) => {
      if (sortField === "title") {
        return factor * collator.compare(a.title, b.title);
      }
      if (sortField === "date") {
        const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return factor * (da - db);
      }
      if (sortField === "deadline") {
        const da = a.deadline
          ? new Date(a.deadline).getTime()
          : Number.MAX_SAFE_INTEGER;
        const db = b.deadline
          ? new Date(b.deadline).getTime()
          : Number.MAX_SAFE_INTEGER;
        return factor * (da - db);
      }
      if (sortField === "priority") {
        const pa = PRIORITY_WEIGHT[a.priority ?? "none"] ?? 0;
        const pb = PRIORITY_WEIGHT[b.priority ?? "none"] ?? 0;
        return factor * (pa - pb);
      }
      if (sortField === "status") {
        const sa = STATUS_WEIGHT[a.status ?? "todo"] ?? 0;
        const sb = STATUS_WEIGHT[b.status ?? "todo"] ?? 0;
        return factor * (sa - sb);
      }
      return 0;
    });
    return copy;
  }, [topLevelTasks, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "priority" ? "desc" : "asc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDownIcon
          aria-hidden="true"
          className="ml-1 size-3.5 text-muted-foreground/60"
        />
      );
    }
    return sortDirection === "asc" ? (
      <ArrowUpIcon aria-hidden="true" className="ml-1 size-3.5 text-primary" />
    ) : (
      <ArrowDownIcon
        aria-hidden="true"
        className="ml-1 size-3.5 text-primary"
      />
    );
  };

  const handleToggleComplete = (task: TaskItem) => {
    const nextStatus: TaskStatus =
      task.status === "completed" ? "todo" : "completed";
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
    <div className="space-y-3">
      {/* Mobile: Cartões empilhados legíveis */}
      <div className="space-y-2.5 md:hidden">
        {sortedTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            childTasks={childrenByParentId.get(task.id)}
            capabilities={capabilitiesByTaskId[task.id]}
            childCapabilitiesMap={capabilitiesByTaskId}
            onView={onView}
            onEdit={onEdit}
            onOpenAudit={onOpenAudit}
            onDelete={onDelete}
            onTaskUpdated={onTaskUpdated}
            canManage={canManage}
          />
        ))}
      </div>

      {/* Desktop: Tabela semântica ordenável */}
      <div
        role="region"
        aria-labelledby="tasks-table-caption"
        tabIndex={0}
        className="hidden overflow-x-auto rounded-xl border bg-card md:block"
      >
        <Table>
          <caption id="tasks-table-caption" className="sr-only">
            Lista completa de tarefas em tabela ordenável
          </caption>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead scope="col" className="w-11 text-center">
                <span className="sr-only">Concluir</span>
              </TableHead>
              <TableHead scope="col" className="w-9 text-center">
                <span className="sr-only">Destaque</span>
              </TableHead>
              <TableHead
                scope="col"
                aria-sort={
                  sortField === "title"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className="inline-flex min-h-[32px] items-center font-medium text-foreground hover:text-primary"
                >
                  Tarefa
                  {renderSortIcon("title")}
                </button>
              </TableHead>
              <TableHead
                scope="col"
                className="w-32"
                aria-sort={
                  sortField === "status"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="inline-flex min-h-[32px] items-center font-medium text-foreground hover:text-primary"
                >
                  Situação
                  {renderSortIcon("status")}
                </button>
              </TableHead>
              <TableHead
                scope="col"
                className="w-28"
                aria-sort={
                  sortField === "priority"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort("priority")}
                  className="inline-flex min-h-[32px] items-center font-medium text-foreground hover:text-primary"
                >
                  Prioridade
                  {renderSortIcon("priority")}
                </button>
              </TableHead>
              <TableHead scope="col">Escopo</TableHead>
              <TableHead scope="col">Responsável</TableHead>
              <TableHead
                scope="col"
                aria-sort={
                  sortField === "date"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort("date")}
                  className="inline-flex min-h-[32px] items-center font-medium text-foreground hover:text-primary"
                >
                  Planejada
                  {renderSortIcon("date")}
                </button>
              </TableHead>
              <TableHead
                scope="col"
                aria-sort={
                  sortField === "deadline"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort("deadline")}
                  className="inline-flex min-h-[32px] items-center font-medium text-foreground hover:text-primary"
                >
                  Prazo
                  {renderSortIcon("deadline")}
                </button>
              </TableHead>
              <TableHead scope="col" className="w-16 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const isCompleted = task.status === "completed";
              const whenLabel = formatTaskWhen(task.date);
              const deadlineInfo = formatTaskDeadline(task.deadline, isCompleted);
              const caps = capabilitiesByTaskId[task.id];
              const canUpdateStatus = caps?.canUpdateStatus ?? canManage;
              const childTasks = childrenByParentId.get(task.id) ?? [];
              const doneChildren = childTasks.filter(
                (c) => c.status === "completed",
              ).length;

              return (
                <TableRow
                  key={task.id}
                  className={cn(
                    "transition-colors",
                    task.isPinned && "bg-primary/[0.02]",
                    isCompleted && "opacity-75",
                  )}
                >
                  <TableCell className="text-center">
                    <button
                      type="button"
                      disabled={isPending || !canUpdateStatus}
                      onClick={() => handleToggleComplete(task)}
                      aria-label={
                        isCompleted
                          ? `Reabrir tarefa ${task.title}`
                          : `Concluir tarefa ${task.title}`
                      }
                      className={cn(
                        "mx-auto flex size-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        !canUpdateStatus && "cursor-not-allowed opacity-40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4.5 items-center justify-center rounded-full border-2 transition-colors",
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background hover:border-primary",
                        )}
                      >
                        {isCompleted ? (
                          <CheckIcon className="size-3 stroke-[3]" />
                        ) : null}
                      </span>
                    </button>
                  </TableCell>

                  <TableCell className="text-center">
                    {task.isPinned ? (
                      <PinIcon
                        aria-label="Tarefa fixada"
                        className="mx-auto size-3.5 fill-primary/20 text-primary"
                      />
                    ) : null}
                  </TableCell>

                  <TableCell className="max-w-[300px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onView(task)}
                          className={cn(
                            "truncate text-left font-medium hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm",
                            isCompleted &&
                              "line-through text-muted-foreground",
                          )}
                        >
                          {task.title}
                        </button>
                        {task.isRecurring ? (
                          <RepeatIcon
                            aria-label="Tarefa recorrente"
                            className="size-3.5 shrink-0 text-primary/70"
                          />
                        ) : null}
                      </div>
                      {task.tags && task.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="h-5 px-1.5 text-xs font-normal text-muted-foreground"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-normal",
                        task.status === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : task.status === "in_progress"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {getStatusLabel(task.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {task.priority && task.priority !== "none" ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-normal",
                          task.priority === "high"
                            ? "border-destructive/30 text-destructive"
                            : task.priority === "medium"
                              ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
                              : "text-muted-foreground",
                        )}
                      >
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {task.department ? (
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {task.department.name}
                      </Badge>
                    ) : task.scope === "organization" ? (
                      <Badge
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        Toda a igreja
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Pessoal
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {childTasks.length > 0 ? (
                      <span className="text-xs font-medium text-primary">
                        {doneChildren}/{childTasks.length} membros
                      </span>
                    ) : task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={task.assignee.image ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(task.assignee.name ?? "M")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[120px] truncate text-xs font-medium">
                          {task.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {whenLabel ?? "—"}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {deadlineInfo ? (
                      <span
                        className={cn(
                          "text-xs font-medium",
                          deadlineInfo.isOverdue
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {deadlineInfo.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {task.url ? (
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir link de apoio de ${task.title}`}
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-primary"
                        >
                          <ExternalLinkIcon className="size-3.5" />
                        </a>
                      ) : null}
                      <TaskActionsMenu
                        task={task}
                        capabilities={caps}
                        onView={onView}
                        onEdit={onEdit}
                        onOpenAudit={onOpenAudit}
                        onDelete={onDelete}
                        onTaskUpdated={onTaskUpdated}
                        canManage={canManage}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
