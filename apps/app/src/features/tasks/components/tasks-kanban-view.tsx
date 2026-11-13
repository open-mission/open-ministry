"use client";

import { useId, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateTaskStatusAction } from "../actions/tasks.actions";
import type { TaskCapabilities } from "../lib/task-permissions";
import { getStatusLabel } from "../lib/task-utils";
import type { TaskItem, TaskStatus } from "../services/tasks-service";
import { TaskCard } from "./task-card";

type TasksKanbanViewProps = {
  tasks: TaskItem[];
  capabilitiesByTaskId?: Record<string, TaskCapabilities>;
  onView: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdated?: (updated: TaskItem) => void;
  onNewTask?: (status?: TaskStatus) => void;
  canManage?: boolean;
};

type ColumnConfig = {
  id: TaskStatus;
  title: string;
  dotClass: string;
};

const CORE_COLUMNS: ColumnConfig[] = [
  { id: "todo", title: "A Fazer", dotClass: "bg-slate-400" },
  { id: "in_progress", title: "Em Andamento", dotClass: "bg-amber-500" },
  { id: "completed", title: "Concluídas", dotClass: "bg-emerald-500" },
];

const CANCELED_COLUMN: ColumnConfig = {
  id: "canceled",
  title: "Canceladas",
  dotClass: "bg-muted-foreground/50",
};

export function TasksKanbanView({
  tasks: initialTasks,
  capabilitiesByTaskId = {},
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  onNewTask,
  canManage = true,
}: TasksKanbanViewProps) {
  const dndContextId = useId();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Esconde tarefas-filhas individuais quando o pai já está presente para evitar duplicação no quadro
  const boardTasks = useMemo(() => {
    const taskIds = new Set(tasks.map((t) => t.id));
    return tasks.filter(
      (t) => !(t.parentTaskId && taskIds.has(t.parentTaskId)),
    );
  }, [tasks]);

  const tasksByColumn = useMemo(() => {
    const groups: Record<TaskStatus, TaskItem[]> = {
      todo: [],
      in_progress: [],
      completed: [],
      canceled: [],
    };
    for (const t of boardTasks) {
      const col = (t.status as TaskStatus) in groups ? (t.status as TaskStatus) : "todo";
      groups[col].push(t);
    }
    return groups;
  }, [boardTasks]);

  const columns = useMemo(() => {
    return tasksByColumn.canceled.length > 0
      ? [...CORE_COLUMNS, CANCELED_COLUMN]
      : CORE_COLUMNS;
  }, [tasksByColumn.canceled.length]);

  const activeTask = useMemo(
    () => (activeId ? boardTasks.find((t) => t.id === activeId) ?? null : null),
    [activeId, boardTasks],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const moving = tasks.find((t) => t.id === activeTaskId);
    if (!moving) return;

    const canMove = capabilitiesByTaskId[activeTaskId]?.canUpdateStatus ?? canManage;
    if (!canMove) return;

    let targetStatus: TaskStatus | undefined;
    if (columns.some((c) => c.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status as TaskStatus;
      }
    }

    if (targetStatus && targetStatus !== moving.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTaskId ? { ...t, status: targetStatus! } : t,
        ),
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      setTasks(initialTasks);
      return;
    }

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const original = initialTasks.find((t) => t.id === activeTaskId);
    if (!original) return;

    const canMove = capabilitiesByTaskId[activeTaskId]?.canUpdateStatus ?? canManage;
    if (!canMove) {
      setTasks(initialTasks);
      toast.error("Você não tem permissão para mover esta tarefa.");
      return;
    }

    let targetStatus: TaskStatus | undefined;
    if (columns.some((c) => c.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status as TaskStatus;
      }
    }

    if (!targetStatus || targetStatus === original.status) return;

    const optimistic: TaskItem = {
      ...original,
      status: targetStatus,
      completedAt: targetStatus === "completed" ? new Date() : null,
    };
    onTaskUpdated?.(optimistic);

    startTransition(async () => {
      const res = await updateTaskStatusAction(activeTaskId, targetStatus!);
      if (res.ok) {
        if (res.data.task) {
          onTaskUpdated?.(res.data.task);
        }
        toast.success(`Movida para "${getStatusLabel(targetStatus!)}"`);
      } else {
        setTasks(initialTasks);
        onTaskUpdated?.(original);
        toast.error(res.error);
      }
    });
  };

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          columns.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3",
        )}
      >
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByColumn[col.id]}
            capabilitiesByTaskId={capabilitiesByTaskId}
            onView={onView}
            onEdit={onEdit}
            onOpenAudit={onOpenAudit}
            onDelete={onDelete}
            onTaskUpdated={onTaskUpdated}
            onNewTask={onNewTask ? () => onNewTask(col.id) : undefined}
            canManage={canManage}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-1 scale-102 opacity-90">
            <TaskCard
              task={activeTask}
              capabilities={capabilitiesByTaskId[activeTask.id]}
              onView={onView}
              onEdit={onEdit}
              onOpenAudit={onOpenAudit}
              onDelete={onDelete}
              onTaskUpdated={onTaskUpdated}
              canManage={canManage}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  tasks,
  capabilitiesByTaskId,
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  onNewTask,
  canManage,
}: {
  column: ColumnConfig;
  tasks: TaskItem[];
  capabilitiesByTaskId: Record<string, TaskCapabilities>;
  onView: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdated?: (updated: TaskItem) => void;
  onNewTask?: () => void;
  canManage: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border bg-muted/25 p-3 transition-colors min-h-[300px]",
        isOver && "bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      {/* Cabeçalho da coluna */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", column.dotClass)} />
          <h3 className="font-heading text-sm font-semibold text-foreground">
            {column.title}
          </h3>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
            {tasks.length}
          </Badge>
        </div>

        {onNewTask ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNewTask}
            aria-label={`Adicionar tarefa em ${column.title}`}
            className="size-10 text-muted-foreground hover:text-foreground sm:size-7"
          >
            <PlusIcon className="size-4" />
          </Button>
        ) : null}
      </div>

      {/* Cartões */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2.5">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              capabilities={capabilitiesByTaskId[task.id]}
              onView={onView}
              onEdit={onEdit}
              onOpenAudit={onOpenAudit}
              onDelete={onDelete}
              onTaskUpdated={onTaskUpdated}
              canManage={canManage}
            />
          ))}

          {tasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
              <span>Nenhuma tarefa aqui</span>
              {onNewTask && column.id !== "canceled" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onNewTask}
                  className="mt-2 h-8 text-xs text-primary"
                >
                  + Adicionar
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}
