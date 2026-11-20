"use client";

import { useState } from "react";
import Link from "next/link";
import { isToday, isTomorrow } from "date-fns";
import { ArrowRightIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { TaskCheckbox } from "@/components/home/task-checkbox";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionDescription,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TaskDetailDialog } from "@/features/tasks/components/task-detail-dialog";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import { resolveTaskCapabilities } from "@/features/tasks/lib/task-permissions";
import { formatTaskDeadline } from "@/features/tasks/lib/task-utils";
import type { TaskItem, TaskStatus } from "@/features/tasks/services/tasks-service";

type DepartmentOption = {
  id: string;
  name: string;
};

type MemberOption = {
  id?: string;
  userId: string;
  personId?: string;
  name: string;
  email?: string | null;
};

export type TasksCardProps = {
  tasks: TaskItem[];
  currentUserId?: string;
  isAdmin?: boolean;
  ledDepartmentIds?: string[];
  memberDepartmentIds?: string[];
  departments?: DepartmentOption[];
  members?: MemberOption[];
};

/** Cores semânticas para o prazo, aplicadas ao checkbox e ao badge. */
function deadlineTone(
  deadline: Date | string | null | undefined,
  isOverdue: boolean,
): { checkbox: string; badge: string } {
  if (isOverdue) {
    return {
      checkbox: "border-destructive",
      badge: "border-0 bg-destructive/15 text-destructive",
    };
  }

  if (deadline) {
    const date = new Date(deadline);
    if (isToday(date)) {
      return {
        checkbox: "border-accent-foreground",
        badge: "border-0 bg-accent text-accent-foreground",
      };
    }
    if (isTomorrow(date)) {
      return {
        checkbox: "border-primary",
        badge: "border-0 bg-primary/15 text-primary",
      };
    }
  }

  return {
    checkbox: "border-muted-foreground/50",
    badge: "border-0 bg-muted text-muted-foreground",
  };
}

export function TasksCard({
  tasks,
  currentUserId,
  isAdmin = false,
  ledDepartmentIds = [],
  memberDepartmentIds = [],
  departments = [],
  members = [],
}: TasksCardProps) {
  const [taskList, setTaskList] = useState<TaskItem[]>(tasks);
  const [previousTasks, setPreviousTasks] = useState(tasks);

  if (tasks !== previousTasks) {
    setPreviousTasks(tasks);
    setTaskList(tasks);
  }

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const activeTasks = taskList
    .filter((task) => task.status === "todo" || task.status === "in_progress")
    .slice(0, 3);

  const handleStatusChange = (taskId: string, nextStatus: TaskStatus) => {
    setTaskList((previous) =>
      previous.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task,
      ),
    );
  };

  const handleTaskUpdated = (updated: TaskItem) => {
    setTaskList((previous) =>
      previous.map((task) => (task.id === updated.id ? updated : task)),
    );
    if (selectedTask?.id === updated.id) {
      setSelectedTask(updated);
    }
  };

  const handleDeleted = (taskId: string) => {
    setTaskList((previous) => previous.filter((task) => task.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setDetailOpen(false);
    }
  };

  const handleOpenDetail = (task: TaskItem) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleEdit = (task: TaskItem) => {
    setEditingTask(task);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const capabilities = selectedTask
    ? resolveTaskCapabilities(selectedTask, {
        userId: currentUserId ?? "",
        isAdmin,
        ledDepartmentIds,
        memberDepartmentIds,
      })
    : undefined;

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <>
      <HomeSection aria-labelledby="home-tasks-title">
        <HomeSectionHeader>
          <div className="space-y-0.5">
            <HomeSectionTitle id="home-tasks-title">
              Minhas Tarefas
            </HomeSectionTitle>
            <HomeSectionDescription className="text-xs">
              Afazeres pessoais e demandas atribuídas a você.
            </HomeSectionDescription>
          </div>
          <HomeSectionAction>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 min-h-[44px] px-2 text-xs text-primary hover:text-primary"
            >
              <Link href="/dashboard/tasks">
                Ver todas
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </HomeSectionAction>
        </HomeSectionHeader>

        <HomeCard>
          <HomeCardContent className="space-y-0">
            {activeTasks.map((task, index) => {
              const deadline = formatTaskDeadline(
                task.deadline,
                task.status === "completed",
              );
              const tone = deadlineTone(
                task.deadline,
                Boolean(deadline?.isOverdue),
              );

              return (
                <div key={task.id}>
                  {index > 0 ? <Separator className="my-1" /> : null}
                  <div className="flex min-h-[44px] items-center gap-3 py-1.5 hover:bg-muted/50">
                    <TaskCheckbox
                      taskId={task.id}
                      initialStatus={task.status}
                      label={task.title}
                      className={tone.checkbox}
                      onStatusChange={(nextStatus) =>
                        handleStatusChange(task.id, nextStatus)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(task)}
                      aria-label={`Abrir detalhes da tarefa: ${task.title}`}
                      className="min-h-[44px] min-w-0 flex-1 cursor-pointer truncate rounded-sm text-left text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {task.title}
                    </button>
                    {deadline ? (
                      <Badge
                        className={`shrink-0 px-2 py-0.5 text-[11px] font-medium tabular-nums ${tone.badge}`}
                      >
                        {deadline.isOverdue
                          ? `Atrasada · ${deadline.label}`
                          : deadline.label}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </HomeCardContent>
        </HomeCard>
      </HomeSection>

      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onDeleted={handleDeleted}
        onTaskUpdated={handleTaskUpdated}
        capabilities={capabilities}
        members={members}
        departments={departments}
      />

      <TaskFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSuccess={(savedTask) => {
          if (!savedTask) return;
          setTaskList((previous) => {
            const exists = previous.some((task) => task.id === savedTask.id);
            return exists
              ? previous.map((task) => (task.id === savedTask.id ? savedTask : task))
              : [savedTask, ...previous];
          });
          if (selectedTask?.id === savedTask.id) {
            setSelectedTask(savedTask);
          }
        }}
        taskToEdit={editingTask}
        departments={departments}
        members={members}
        currentUserId={currentUserId}
        canDelegateDepartment={ledDepartmentIds.length > 0}
        canDelegateChurch={isAdmin}
      />
    </>
  );
}
