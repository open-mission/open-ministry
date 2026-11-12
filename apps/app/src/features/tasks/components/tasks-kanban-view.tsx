"use client";

import { useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  ListTodoIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  reorderTasksAction,
  updateTaskStatusAction,
} from "../actions/tasks.actions";
import { TaskCard } from "./task-card";
import type { TaskItem, TaskStatus } from "../services/tasks-service";

type TasksKanbanViewProps = {
  tasks: TaskItem[];
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onNewTask: (defaultStatus?: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  canManage?: boolean;
};

type KanbanColumn = {
  id: TaskStatus;
  title: string;
  icon: typeof ListTodoIcon;
  colorClass: string;
};

const COLUMNS: KanbanColumn[] = [
  {
    id: "todo",
    title: "A Fazer",
    icon: ListTodoIcon,
    colorClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  {
    id: "in_progress",
    title: "Em Andamento",
    icon: CircleDotIcon,
    colorClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  {
    id: "completed",
    title: "Concluídas",
    icon: CheckCircle2Icon,
    colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  },
];

export function TasksKanbanView({
  tasks,
  onEdit,
  onOpenAudit,
  onNewTask,
  onDelete,
  canManage = true,
}: TasksKanbanViewProps) {
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [items, setItems] = useState<TaskItem[]>(tasks);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setItems(tasks);
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

  const columnTasks = useMemo<Record<string, TaskItem[]>>(() => {
    return {
      todo: items.filter((t) => t.status === "todo"),
      in_progress: items.filter((t) => t.status === "in_progress"),
      completed: items.filter((t) => t.status === "completed"),
      canceled: items.filter((t) => t.status === "canceled"),
    };
  }, [items]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = items.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeItem = items.find((t) => t.id === activeId);
    if (!activeItem) return;

    // Se soltou sobre uma coluna
    let targetStatus: TaskStatus | null = null;
    if (COLUMNS.some((c) => c.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      // Soltou sobre outro card
      const overItem = items.find((t) => t.id === overId);
      if (overItem) {
        targetStatus = overItem.status as TaskStatus;
      }
    }

    if (!targetStatus) return;

    // Se mudou de coluna / status
    if (activeItem.status !== targetStatus) {
      setItems((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus! } : t)),
      );

      const res = await updateTaskStatusAction(activeId, targetStatus);
      if (!res.ok) {
        toast.error(res.error);
        // reverte
        setItems(tasks);
      } else {
        toast.success(`Status alterado para "${targetStatus}"`);
      }
    } else if (activeId !== overId) {
      // Reordenação na mesma coluna
      const oldIndex = items.findIndex((t) => t.id === activeId);
      const newIndex = items.findIndex((t) => t.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        setItems(reordered);
        await reorderTasksAction(reordered.map((t) => t.id));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colItems = columnTasks[col.id] || [];

          return (
            <KanbanColumnContainer
              key={col.id}
              column={col}
              tasks={colItems}
              onEdit={onEdit}
              onOpenAudit={onOpenAudit}
              onNewTask={onNewTask}
              onDelete={onDelete}
              canManage={canManage}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 scale-105 shadow-2xl">
            <TaskCard
              task={activeTask}
              onEdit={() => {}}
              onOpenAudit={() => {}}
              canManage={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumnContainer({
  column,
  tasks,
  onEdit,
  onOpenAudit,
  onNewTask,
  onDelete,
  canManage,
}: {
  column: KanbanColumn;
  tasks: TaskItem[];
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onNewTask: (defaultStatus?: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  canManage?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const Icon = column.icon;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl border border-border/70 bg-muted/20 p-3 min-h-[420px] transition-colors",
        isOver && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md",
              column.colorClass,
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <h3 className="font-semibold text-xs tracking-tight text-foreground">
            {column.title}
          </h3>
          <Badge
            variant="secondary"
            className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-semibold"
          >
            {tasks.length}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={() => onNewTask(column.id)}
          title={`Adicionar tarefa em ${column.title}`}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      {/* Cards List with SortableContext */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2.5">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onOpenAudit={onOpenAudit}
              onDelete={onDelete}
              canManage={canManage}
            />
          ))}

          {tasks.length === 0 && (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground/70">
              <p>Nenhuma tarefa aqui</p>
              <button
                type="button"
                onClick={() => onNewTask(column.id)}
                className="mt-1 text-primary hover:underline text-[11px]"
              >
                + Adicionar
              </button>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
