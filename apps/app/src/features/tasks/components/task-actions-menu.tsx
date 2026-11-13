"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  EditIcon,
  EyeIcon,
  HistoryIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  deleteTaskAction,
  toggleTaskPinAction,
  updateTaskStatusAction,
} from "../actions/tasks.actions";
import type { TaskCapabilities } from "../lib/task-permissions";
import { getStatusLabel } from "../lib/task-utils";
import type { TaskItem, TaskStatus } from "../services/tasks-service";

type TaskActionsMenuProps = {
  task: TaskItem;
  capabilities?: TaskCapabilities;
  onView?: (task: TaskItem) => void;
  onEdit?: (task: TaskItem) => void;
  onOpenAudit?: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  onTaskUpdated?: (updated: TaskItem) => void;
  canManage?: boolean;
};

export function TaskActionsMenu({
  task,
  capabilities,
  onView,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  canManage = true,
}: TaskActionsMenuProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canUpdateStatus = capabilities?.canUpdateStatus ?? canManage;
  const canEdit = capabilities?.canEdit ?? canManage;
  const canDelete = capabilities?.canDelete ?? canManage;
  const canPin = capabilities?.canPin ?? canManage;

  const isCompleted = task.status === "completed";
  const isInProgress = task.status === "in_progress";
  const isCanceled = task.status === "canceled";

  const handleTogglePin = () => {
    setDrawerOpen(false);
    startTransition(async () => {
      const res = await toggleTaskPinAction(task.id);
      if (res.ok) {
        const nextPinned = res.data.isPinned;
        onTaskUpdated?.({ ...task, isPinned: nextPinned });
        toast.success(nextPinned ? "Tarefa fixada no topo." : "Tarefa desafixada.");
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSetStatus = (status: TaskStatus) => {
    setDrawerOpen(false);
    startTransition(async () => {
      const res = await updateTaskStatusAction(task.id, status);
      if (res.ok) {
        onTaskUpdated?.(
          res.data.task ?? {
            ...task,
            status,
            completedAt: status === "completed" ? new Date() : null,
          },
        );
        toast.success(`Situação alterada para ${getStatusLabel(status)}.`);
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleRequestDelete = () => {
    setDrawerOpen(false);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    startTransition(async () => {
      const res = await deleteTaskAction(task.id);
      if (res.ok) {
        setConfirmDeleteOpen(false);
        setDrawerOpen(false);
        onDelete?.(task.id);
        toast.success("Tarefa excluída.");
      } else {
        toast.error(res.error);
      }
    });
  };

  const deleteConfirmModal = isMobile ? (
    <Drawer open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader className="!text-left px-0">
          <DrawerTitle className="font-heading text-lg font-bold">
            Excluir tarefa?
          </DrawerTitle>
          <DrawerDescription>
            Tem certeza que deseja excluir &ldquo;{task.title}&rdquo;? Esta ação não poderá ser desfeita.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="px-0 pt-2">
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirmDelete}
            className="min-h-[44px] w-full"
          >
            {isPending ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2Icon className="mr-2 size-4" />
            )}
            Excluir definitivamente
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setConfirmDeleteOpen(false)}
            className="min-h-[44px] w-full"
          >
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ) : (
    <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &ldquo;{task.title}&rdquo;? Esta ação não poderá ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirmDelete();
            }}
          >
            {isPending ? (
              <Loader2Icon className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Trash2Icon className="mr-1.5 size-4" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isPending}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Mais ações para ${task.title}`}
              className="size-11 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontalIcon className="size-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="px-4 pb-8">
            <DrawerHeader className="!text-left pb-2">
              <DrawerTitle className="font-heading text-lg font-bold line-clamp-1">
                {task.title}
              </DrawerTitle>
              <DrawerDescription>
                {getStatusLabel(task.status)} · Escolha uma ação
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex flex-col gap-1.5 py-2">
              {onView ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium"
                  onClick={() => {
                    setDrawerOpen(false);
                    onView(task);
                  }}
                >
                  <EyeIcon className="size-4 text-muted-foreground" />
                  Visualizar detalhes
                </Button>
              ) : null}

              {canUpdateStatus ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium"
                    onClick={() =>
                      handleSetStatus(isCompleted ? "todo" : "completed")
                    }
                  >
                    {isCompleted ? (
                      <>
                        <CircleIcon className="size-4 text-muted-foreground" />
                        Reabrir tarefa
                      </>
                    ) : (
                      <>
                        <CheckCircle2Icon className="size-4 text-emerald-600" />
                        Marcar como concluída
                      </>
                    )}
                  </Button>

                  {!isInProgress ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium"
                      onClick={() => handleSetStatus("in_progress")}
                    >
                      <ClockIcon className="size-4 text-amber-600" />
                      Mover para em andamento
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium"
                      onClick={() => handleSetStatus("todo")}
                    >
                      <CircleIcon className="size-4 text-muted-foreground" />
                      Mover para a fazer
                    </Button>
                  )}

                  {!isCanceled ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium"
                      onClick={() => handleSetStatus("canceled")}
                    >
                      <XCircleIcon className="size-4 text-muted-foreground" />
                      Cancelar tarefa
                    </Button>
                  ) : null}
                </>
              ) : null}

              {canPin ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium"
                  onClick={handleTogglePin}
                >
                  {task.isPinned ? (
                    <>
                      <PinOffIcon className="size-4 text-muted-foreground" />
                      Remover do topo
                    </>
                  ) : (
                    <>
                      <PinIcon className="size-4 text-primary" />
                      Fixar no topo
                    </>
                  )}
                </Button>
              ) : null}

              {canEdit && onEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium"
                  onClick={() => {
                    setDrawerOpen(false);
                    onEdit(task);
                  }}
                >
                  <EditIcon className="size-4 text-muted-foreground" />
                  Editar tarefa
                </Button>
              ) : null}

              {onOpenAudit ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenAudit(task);
                  }}
                >
                  <HistoryIcon className="size-4 text-muted-foreground" />
                  Histórico de alterações
                </Button>
              ) : null}

              {canDelete ? (
                <div className="mt-2 border-t pt-2">
                  <DrawerNestedRoot
                    open={confirmDeleteOpen}
                    onOpenChange={setConfirmDeleteOpen}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-[44px] w-full justify-start gap-3 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmDeleteOpen(true)}
                    >
                      <Trash2Icon className="size-4" />
                      Excluir tarefa
                    </Button>
                    <DrawerContent className="px-4 pb-6">
                      <DrawerHeader className="!text-left px-0">
                        <DrawerTitle className="font-heading text-lg font-bold">
                          Excluir tarefa?
                        </DrawerTitle>
                        <DrawerDescription>
                          Tem certeza que deseja excluir &ldquo;{task.title}&rdquo;? Esta ação não poderá ser desfeita.
                        </DrawerDescription>
                      </DrawerHeader>
                      <DrawerFooter className="px-0 pt-2">
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={isPending}
                          onClick={handleConfirmDelete}
                          className="min-h-[44px] w-full"
                        >
                          {isPending ? (
                            <Loader2Icon className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="mr-2 size-4" />
                          )}
                          Excluir definitivamente
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => setConfirmDeleteOpen(false)}
                          className="min-h-[44px] w-full"
                        >
                          Cancelar
                        </Button>
                      </DrawerFooter>
                    </DrawerContent>
                  </DrawerNestedRoot>
                </div>
              ) : null}
            </div>
          </DrawerContent>
        </Drawer>
        {!drawerOpen && confirmDeleteOpen ? deleteConfirmModal : null}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isPending}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Mais ações para ${task.title}`}
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56"
          onClick={(e) => e.stopPropagation()}
        >
          {onView ? (
            <DropdownMenuItem onClick={() => onView(task)}>
              <EyeIcon className="mr-2 size-4" />
              Visualizar detalhes
            </DropdownMenuItem>
          ) : null}

          {canUpdateStatus ? (
            <>
              <DropdownMenuItem
                onClick={() =>
                  handleSetStatus(isCompleted ? "todo" : "completed")
                }
              >
                {isCompleted ? (
                  <>
                    <CircleIcon className="mr-2 size-4" />
                    Reabrir tarefa
                  </>
                ) : (
                  <>
                    <CheckCircle2Icon className="mr-2 size-4 text-emerald-600" />
                    Marcar como concluída
                  </>
                )}
              </DropdownMenuItem>

              {!isInProgress ? (
                <DropdownMenuItem onClick={() => handleSetStatus("in_progress")}>
                  <ClockIcon className="mr-2 size-4 text-amber-600" />
                  Mover para em andamento
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleSetStatus("todo")}>
                  <CircleIcon className="mr-2 size-4" />
                  Mover para a fazer
                </DropdownMenuItem>
              )}

              {!isCanceled ? (
                <DropdownMenuItem onClick={() => handleSetStatus("canceled")}>
                  <XCircleIcon className="mr-2 size-4" />
                  Cancelar tarefa
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}

          {canPin ? (
            <DropdownMenuItem onClick={handleTogglePin}>
              {task.isPinned ? (
                <>
                  <PinOffIcon className="mr-2 size-4" />
                  Remover do topo
                </>
              ) : (
                <>
                  <PinIcon className="mr-2 size-4 text-primary" />
                  Fixar no topo
                </>
              )}
            </DropdownMenuItem>
          ) : null}

          {(canEdit && onEdit) || onOpenAudit ? <DropdownMenuSeparator /> : null}

          {canEdit && onEdit ? (
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <EditIcon className="mr-2 size-4" />
              Editar tarefa
            </DropdownMenuItem>
          ) : null}

          {onOpenAudit ? (
            <DropdownMenuItem onClick={() => onOpenAudit(task)}>
              <HistoryIcon className="mr-2 size-4" />
              Histórico de alterações
            </DropdownMenuItem>
          ) : null}

          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={handleRequestDelete}
              >
                <Trash2Icon className="mr-2 size-4" />
                Excluir tarefa
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {deleteConfirmModal}
    </>
  );
}
