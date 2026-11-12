"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
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
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  ListTodoIcon,
  PinIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { reorderTasksAction } from "../actions/tasks.actions";
import { TaskRow } from "./task-row";
import type { TaskItem } from "../services/tasks-service";

type TasksListViewProps = {
  tasks: TaskItem[];
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  canManage?: boolean;
};

export function TasksListView({
  tasks,
  onEdit,
  onOpenAudit,
  onDelete,
  canManage = true,
}: TasksListViewProps) {
  const [completedOpen, setCompletedOpen] = useState(false);
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [items, setItems] = useState<TaskItem[]>(tasks);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    // Salva reordenação
    const taskIds = reordered.map((t) => t.id);
    await reorderTasksAction(taskIds);
  };

  // Seções Things 3
  const pinnedTasks = useMemo(
    () => items.filter((t) => t.isPinned && t.status !== "completed"),
    [items],
  );

  const scheduledTasks = useMemo(
    () =>
      items.filter(
        (t) => !t.isPinned && t.date && t.status !== "completed",
      ),
    [items],
  );

  const deadlineTasks = useMemo(
    () =>
      items.filter(
        (t) =>
          !t.isPinned &&
          !t.date &&
          t.deadline &&
          t.status !== "completed",
      ),
    [items],
  );

  const generalTasks = useMemo(
    () =>
      items.filter(
        (t) =>
          !t.isPinned &&
          !t.date &&
          !t.deadline &&
          t.status !== "completed",
      ),
    [items],
  );

  const completedTasks = useMemo(
    () => items.filter((t) => t.status === "completed"),
    [items],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-6">
          {/* Seção: Fixadas */}
          {pinnedTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <PinIcon className="size-3.5 fill-primary" />
                <span>Fixadas no Topo</span>
                <Badge variant="secondary" className="size-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {pinnedTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {pinnedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={onEdit}
                    onOpenAudit={onOpenAudit}
                    onDelete={onDelete}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seção: Hoje / Agendadas (Quando trabalhar) */}
          {scheduledTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <CalendarDaysIcon className="size-3.5" />
                <span>Hoje & Agendadas</span>
                <Badge variant="secondary" className="size-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {scheduledTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {scheduledTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={onEdit}
                    onOpenAudit={onOpenAudit}
                    onDelete={onDelete}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seção: Prazos / Deadlines */}
          {deadlineTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <ClockIcon className="size-3.5" />
                <span>Prazos Limites</span>
                <Badge variant="secondary" className="size-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {deadlineTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {deadlineTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={onEdit}
                    onOpenAudit={onOpenAudit}
                    onDelete={onDelete}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seção: A Fazer (Gerais) */}
          {generalTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ListTodoIcon className="size-3.5" />
                <span>A Fazer</span>
                <Badge variant="secondary" className="size-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {generalTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {generalTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={onEdit}
                    onOpenAudit={onOpenAudit}
                    onDelete={onDelete}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seção: Concluídas (Recolhível) */}
          {completedTasks.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setCompletedOpen(!completedOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {completedOpen ? (
                  <ChevronDownIcon className="size-3.5" />
                ) : (
                  <ChevronRightIcon className="size-3.5" />
                )}
                <CheckCircle2Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Concluídas</span>
                <Badge variant="outline" className="text-[10px] ml-1">
                  {completedTasks.length}
                </Badge>
              </button>

              {completedOpen && (
                <div className="space-y-2 pt-1">
                  {completedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onEdit={onEdit}
                      onOpenAudit={onOpenAudit}
                      onDelete={onDelete}
                      canManage={canManage}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
