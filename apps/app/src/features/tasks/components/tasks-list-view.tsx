"use client";

import { useId, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  PinIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { reorderTasksAction } from "../actions/tasks.actions";
import type { TaskCapabilities } from "../lib/task-permissions";
import type { TaskItem } from "../services/tasks-service";
import { TaskRow } from "./task-row";

type TasksListViewProps = {
  tasks: TaskItem[];
  capabilitiesByTaskId?: Record<string, TaskCapabilities>;
  onView: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdated?: (updated: TaskItem) => void;
  canManage?: boolean;
};

export function TasksListView({
  tasks: initialTasks,
  capabilitiesByTaskId = {},
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  canManage = true,
}: TasksListViewProps) {
  const dndContextId = useId();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
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

  // Agrupa tarefas filhas sob o respectivo pai de delegação individual (quando o pai está visível)
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

  const { pinnedTasks, activeTasks, completedTasks, canceledTasks } =
    useMemo(() => {
      const pinned: TaskItem[] = [];
      const active: TaskItem[] = [];
      const completed: TaskItem[] = [];
      const canceled: TaskItem[] = [];

      for (const task of topLevelTasks) {
        if (task.status === "completed") {
          completed.push(task);
        } else if (task.status === "canceled") {
          canceled.push(task);
        } else if (task.isPinned) {
          pinned.push(task);
        } else {
          active.push(task);
        }
      }

      return {
        pinnedTasks: pinned,
        activeTasks: active,
        completedTasks: completed,
        canceledTasks: canceled,
      };
    }, [topLevelTasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeTasks.findIndex((item) => item.id === active.id);
    const newIndex = activeTasks.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const previousSnapshot = tasks;
    const reorderedActive = arrayMove(activeTasks, oldIndex, newIndex);
    const newOrderedIds = reorderedActive.map((t) => t.id);

    const updated = tasks.map((t) => {
      const foundIdx = newOrderedIds.indexOf(t.id);
      if (foundIdx !== -1) {
        return { ...t, sortOrder: foundIdx };
      }
      return t;
    });

    updated.sort((a, b) => a.sortOrder - b.sortOrder);
    setTasks(updated);

    startTransition(async () => {
      const res = await reorderTasksAction(newOrderedIds);
      if (!res.ok) {
        setTasks(previousSnapshot);
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Fixadas / Destaque */}
      {pinnedTasks.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <PinIcon className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Fixadas no topo ({pinnedTasks.length})
            </h2>
          </div>
          <div className="space-y-2">
            {pinnedTasks.map((task) => (
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
        </section>
      ) : null}

      {/* 2. A Fazer / Em Andamento */}
      <section className="space-y-2.5">
        {pinnedTasks.length > 0 && activeTasks.length > 0 ? (
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendentes e em andamento ({activeTasks.length})
            </h2>
          </div>
        ) : null}

        {activeTasks.length > 0 ? (
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {activeTasks.map((task) => (
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
                    isSortable={true}
                    canManage={canManage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : pinnedTasks.length === 0 &&
          completedTasks.length === 0 &&
          canceledTasks.length === 0 ? null : pinnedTasks.length === 0 &&
          activeTasks.length === 0 &&
          (completedTasks.length > 0 || canceledTasks.length > 0) ? (
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Nenhuma tarefa pendente nesta visão.
          </div>
        ) : null}
      </section>

      {/* 3. Concluídas (Recolhível) */}
      {completedTasks.length > 0 ? (
        <section className="border-t pt-4">
          <button
            type="button"
            aria-expanded={showCompleted}
            onClick={() => setShowCompleted((v) => !v)}
            className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              Concluídas ({completedTasks.length})
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                showCompleted && "rotate-180",
              )}
            />
          </button>

          {showCompleted ? (
            <div className="mt-2.5 space-y-2">
              {completedTasks.map((task) => (
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
          ) : null}
        </section>
      ) : null}

      {/* 4. Canceladas (Recolhível) */}
      {canceledTasks.length > 0 ? (
        <section className="border-t pt-4">
          <button
            type="button"
            aria-expanded={showCanceled}
            onClick={() => setShowCanceled((v) => !v)}
            className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <XCircleIcon className="size-4 text-muted-foreground" />
              Canceladas ({canceledTasks.length})
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                showCanceled && "rotate-180",
              )}
            />
          </button>

          {showCanceled ? (
            <div className="mt-2.5 space-y-2">
              {canceledTasks.map((task) => (
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
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
