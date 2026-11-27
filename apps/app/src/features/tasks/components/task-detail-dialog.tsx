"use client";

import { useState, useTransition } from "react";
import {
  BellRingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  EditIcon,
  ExternalLinkIcon,
  HistoryIcon,
  Loader2Icon,
  PinIcon,
  Trash2Icon,
  UserIcon,
  UsersIcon,
  XIcon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  deleteTaskAction,
  updateTaskStatusAction,
} from "../actions/tasks.actions";
import { formatRecurrenceSummary, getScopeLabel } from "../lib/task-helpers";
import type { TaskCapabilities } from "../lib/task-permissions";
import {
  formatTaskDeadline,
  formatTaskWhen,
  getPriorityLabel,
  getStatusLabel,
} from "../lib/task-utils";
import type { TaskItem, TaskStatus } from "../services/tasks-service";
import { TaskAuditHistoryDialog } from "./task-audit-history-dialog";

type TaskDetailDialogProps = {
  task: TaskItem | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (task: TaskItem) => void;
  onDeleted?: (taskId: string) => void;
  onTaskUpdated?: (updated: TaskItem) => void;
  capabilities?: TaskCapabilities;
  members?: { userId: string; name: string }[];
  departments?: { id: string; name: string }[];
  canManage?: boolean;
};

export function TaskDetailDialog({
  task,
  open,
  onClose,
  onEdit,
  onDeleted,
  onTaskUpdated,
  capabilities,
  members = [],
  departments = [],
  canManage = true,
}: TaskDetailDialogProps) {
  const isMobile = useIsMobile();
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!task) return null;

  const canUpdateStatus = capabilities?.canUpdateStatus ?? canManage;
  const canEdit = capabilities?.canEdit ?? canManage;
  const canDelete = capabilities?.canDelete ?? canManage;

  const isCompleted = task.status === "completed";
  const whenLabel = formatTaskWhen(task.date);
  const deadlineInfo = formatTaskDeadline(task.deadline, isCompleted);
  const recurrenceLabel = task.isRecurring
    ? formatRecurrenceSummary(task.recurrenceRule)
    : null;
  const assigneeName = task.assignee?.name ?? task.assigneePerson?.name ?? null;
  const hasDeadlineDetails = Boolean(
    whenLabel ||
      deadlineInfo ||
      task.department ||
      assigneeName ||
      recurrenceLabel,
  );

  const handleStatusChange = (nextStatus: TaskStatus) => {
    if (nextStatus === task.status) return;
    startTransition(async () => {
      const res = await updateTaskStatusAction(task.id, nextStatus);
      if (res.ok) {
        onTaskUpdated?.(
          res.data.task ?? {
            ...task,
            status: nextStatus,
            completedAt: nextStatus === "completed" ? new Date() : null,
          },
        );
        toast.success(`Situação alterada para ${getStatusLabel(nextStatus)}.`);
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const res = await deleteTaskAction(task.id);
      if (res.ok) {
        setConfirmDeleteOpen(false);
        onDeleted?.(task.id);
        onClose();
        toast.success("Tarefa excluída.");
      } else {
        toast.error(res.error);
      }
    });
  };

  const statusToneClass =
    task.status === "completed"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : task.status === "in_progress"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
        : task.status === "canceled"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-primary/10 text-primary border-primary/30";

  const content = (
    <div className="space-y-4 py-1">
      {/* Metadados principais */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("text-xs", statusToneClass)}>
          {getStatusLabel(task.status)}
        </Badge>

        {task.isPinned ? (
          <Badge variant="outline" className="gap-1 border-primary/30 text-xs text-primary">
            <PinIcon className="size-3" />
            Fixada
          </Badge>
        ) : null}

        {task.priority && task.priority !== "none" ? (
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              task.priority === "high"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : task.priority === "medium"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            Prioridade {getPriorityLabel(task.priority)}
          </Badge>
        ) : null}

        <Badge variant="secondary" className="text-xs">
          {task.scope === "department" && task.department
            ? task.department.name
            : getScopeLabel(task.scope)}
        </Badge>
      </div>

      {/* Alterar situação diretamente */}
      {canUpdateStatus ? (
        <div className="space-y-1.5 rounded-xl border bg-muted/20 p-3">
          <Label htmlFor="detail-task-status" className="text-xs font-medium text-muted-foreground">
            Situação atual
          </Label>
          <NativeSelect
            id="detail-task-status"
            value={task.status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className="min-h-11 w-full sm:min-h-9.5"
          >
            <option value="todo">A Fazer</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluída</option>
            <option value="canceled">Cancelada</option>
          </NativeSelect>
        </div>
      ) : null}

      {/* Descrição / Notas */}
      {task.description ? (
        <div className="rounded-xl border bg-card p-3.5 text-sm whitespace-pre-wrap wrap-break-word leading-relaxed text-foreground">
          {task.description}
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Nenhuma observação adicional registrada.
        </p>
      )}

      {/* Prazos e Responsáveis */}
      {hasDeadlineDetails ? (
        <div className="grid grid-cols-1 gap-2.5 rounded-xl border bg-muted/20 p-3.5 text-sm sm:grid-cols-2">
          {whenLabel ? (
            <div className="flex items-start gap-2.5">
              <CalendarIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Data planejada</p>
                <p className="font-medium text-foreground">{whenLabel}</p>
              </div>
            </div>
          ) : null}

          {deadlineInfo ? (
            <div className="flex items-start gap-2.5">
              <ClockIcon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  deadlineInfo.isOverdue
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              />
              <div>
                <p className="text-xs text-muted-foreground">Prazo de entrega</p>
                <p
                  className={cn(
                    "font-medium",
                    deadlineInfo.isOverdue
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {deadlineInfo.label}
                </p>
              </div>
            </div>
          ) : null}

          {task.department ? (
            <div className="flex items-start gap-2.5">
              <UsersIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Departamento</p>
                <p className="font-medium text-foreground">
                  {task.department.name}
                </p>
              </div>
            </div>
          ) : null}

          {assigneeName ? (
            <div className="flex items-start gap-2.5">
              <UserIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="font-medium wrap-break-word text-foreground">
                  {assigneeName}
                </p>
              </div>
            </div>
          ) : null}

          {recurrenceLabel ? (
            <div className="flex items-start gap-2.5 sm:col-span-2">
              <BellRingIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Lembrete semanal</p>
                <p className="font-medium text-foreground">{recurrenceLabel}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Etiquetas */}
      {task.tags && task.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Link de apoio */}
      {task.url ? (
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-between rounded-xl border bg-background px-3.5 py-2 text-sm font-medium text-primary hover:bg-muted/40 transition-colors"
        >
          <span className="truncate">Abrir link de apoio</span>
          <ExternalLinkIcon className="ml-2 size-4 shrink-0" />
        </a>
      ) : null}
    </div>
  );

  const showEditAction = Boolean(canEdit && onEdit);

  // Ações secundárias no mobile ficam no fim da rolagem para nunca cobrir os detalhes
  const mobileSecondaryActions = (
    <div className="flex gap-2 border-t pt-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => setAuditOpen(true)}
        className="min-h-11 flex-1 gap-1.5"
      >
        <HistoryIcon className="size-4" />
        Histórico
      </Button>

      {canDelete ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={isPending}
          className="min-h-11 flex-1 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-4" />
          Excluir
        </Button>
      ) : null}
    </div>
  );

  const desktopActions = (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setAuditOpen(true)}
          className="min-h-9 gap-1.5"
        >
          <HistoryIcon className="size-4" />
          Histórico
        </Button>

        {canDelete ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isPending}
            className="min-h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
            Excluir
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2">
        {showEditAction ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              onEdit?.(task);
            }}
            className="min-h-9 gap-1.5"
          >
            <EditIcon className="size-4" />
            Editar
          </Button>
        ) : null}

        {canUpdateStatus ? (
          <Button
            type="button"
            onClick={() => handleStatusChange(isCompleted ? "todo" : "completed")}
            disabled={isPending}
            className="min-h-9 gap-1.5"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            {isCompleted ? "Reabrir tarefa" : "Concluir tarefa"}
          </Button>
        ) : null}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
          <DrawerContent className="flex h-auto max-h-[90dvh] data-[vaul-drawer-direction=bottom]:max-h-[90dvh] flex-col gap-0 rounded-t-[24px] bg-background p-0">
            <DrawerHeader className="shrink-0 border-b px-4 pt-3 pb-3 text-left! group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <DrawerTitle
                    className={cn(
                      "font-heading text-lg font-bold leading-snug wrap-break-word",
                      isCompleted && "line-through text-muted-foreground",
                    )}
                  >
                    {task.title}
                  </DrawerTitle>
                  <DrawerDescription>
                    {task.createdBy?.name
                      ? `Criada por ${task.createdBy.name}`
                      : "Detalhes da tarefa"}
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Fechar detalhes da tarefa"
                    className="size-11 -mr-2 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-5" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div
              data-vaul-no-drag=""
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
            >
              <div className="space-y-4 px-4 py-3.5">
                {content}
                {mobileSecondaryActions}
              </div>
            </div>

            <DrawerFooter className="shrink-0 flex-row items-center gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {showEditAction ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onEdit?.(task);
                  }}
                  className="min-h-11 shrink-0 gap-1.5 px-4"
                >
                  <EditIcon className="size-4" />
                  Editar
                </Button>
              ) : null}

              {canUpdateStatus ? (
                <Button
                  type="button"
                  onClick={() =>
                    handleStatusChange(isCompleted ? "todo" : "completed")
                  }
                  disabled={isPending}
                  className="min-h-11 flex-1 gap-1.5"
                >
                  {isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CheckIcon className="size-4" />
                  )}
                  {isCompleted ? "Reabrir tarefa" : "Concluir tarefa"}
                </Button>
              ) : null}

              {!showEditAction && !canUpdateStatus ? (
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full"
                  >
                    Fechar
                  </Button>
                </DrawerClose>
              ) : null}
            </DrawerFooter>

            <TaskAuditHistoryDialog
              task={task}
              open={auditOpen}
              onClose={() => setAuditOpen(false)}
              members={members}
              departments={departments}
              nested
            />

            <DrawerNestedRoot
              open={confirmDeleteOpen}
              onOpenChange={setConfirmDeleteOpen}
            >
              <DrawerContent
                role="alertdialog"
                className="max-h-[85dvh] data-[vaul-drawer-direction=bottom]:max-h-[85dvh] rounded-t-[24px] bg-background px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              >
                <DrawerHeader className="text-left! px-0">
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
                    onClick={handleDeleteConfirm}
                    className="min-h-11 w-full"
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
                    className="min-h-11 w-full"
                  >
                    Cancelar
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </DrawerNestedRoot>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
            <DialogTitle
              className={cn(
                "font-heading text-xl font-bold pr-6 wrap-break-word",
                isCompleted && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </DialogTitle>
            <DialogDescription>
              {task.createdBy?.name
                ? `Criada por ${task.createdBy.name}`
                : "Visualização detalhada da tarefa"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {content}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 border-t px-6 py-4">
            {desktopActions}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskAuditHistoryDialog
        task={task}
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        members={members}
        departments={departments}
      />

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
                handleDeleteConfirm();
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
    </>
  );
}
