"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  PencilIcon,
  PinIcon,
  RepeatIcon,
  TagIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  updateTaskStatusAction,
} from "../actions/tasks.actions";
import {
  formatTaskDeadline,
  formatTaskWhen,
  getPriorityLabel,
  getStatusLabel,
} from "../lib/task-utils";
import { TaskActionsMenu } from "./task-actions-menu";
import type { TaskItem, TaskPriority, TaskStatus } from "../services/tasks-service";

type TaskDetailDialogProps = {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  onTaskUpdated?: (updatedTask: TaskItem) => void;
  canManage?: boolean;
};

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  canManage = true,
}: TaskDetailDialogProps) {
  const isMobile = useIsMobile();

  if (!task) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-0">
          <TaskDetailBody
            key={`${task.id}-${task.status}-${task.isPinned}`}
            task={task}
            isMobile={true}
            onClose={() => onOpenChange(false)}
            onEdit={onEdit}
            onOpenAudit={onOpenAudit}
            onDelete={onDelete}
            onTaskUpdated={onTaskUpdated}
            canManage={canManage}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[88vh] overflow-y-auto p-6 sm:p-7">
        <TaskDetailBody
          key={`${task.id}-${task.status}-${task.isPinned}`}
          task={task}
          isMobile={false}
          onClose={() => onOpenChange(false)}
          onEdit={onEdit}
          onOpenAudit={onOpenAudit}
          onDelete={onDelete}
          onTaskUpdated={onTaskUpdated}
          canManage={canManage}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailBody({
  task,
  isMobile,
  onClose,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  canManage = true,
}: {
  task: TaskItem;
  isMobile: boolean;
  onClose: () => void;
  onEdit: (task: TaskItem) => void;
  onOpenAudit: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
  onTaskUpdated?: (updatedTask: TaskItem) => void;
  canManage?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [currentTask, setCurrentTask] = useState<TaskItem>(task);

  const isCompleted = currentTask.status === "completed";
  const whenText = formatTaskWhen(currentTask.date);
  const deadlineInfo = formatTaskDeadline(currentTask.deadline, isCompleted);

  // Só exibe "Criado por" se a tarefa foi criada por outra pessoa ou delegada
  const isSelfTask =
    currentTask.scope === "personal" &&
    (!currentTask.assigneeId || currentTask.assigneeId === currentTask.createdById);
  const showCreatedBy = !isSelfTask && Boolean(currentTask.createdBy);

  const handleToggleComplete = () => {
    const nextStatus: TaskStatus = isCompleted ? "todo" : "completed";
    const optimisticTask: TaskItem = {
      ...currentTask,
      status: nextStatus,
      completedAt: nextStatus === "completed" ? new Date() : null,
    };

    setCurrentTask(optimisticTask);
    onTaskUpdated?.(optimisticTask);

    startTransition(async () => {
      const res = await updateTaskStatusAction(currentTask.id, nextStatus);
      if (!res.ok) {
        toast.error(res.error || "Erro ao atualizar status");
        setCurrentTask(currentTask);
        onTaskUpdated?.(currentTask);
        return;
      }
      toast.success(
        nextStatus === "completed"
          ? "Tarefa concluída com sucesso!"
          : "Tarefa reaberta!",
      );
    });
  };

  const priorityColor: Record<TaskPriority, string> = {
    high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    none: "bg-muted text-muted-foreground border-transparent",
  };

  const badgesAndMenu = (
    <div className="flex items-start justify-between gap-3">
      {/* Badges de Identificação */}
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        <Badge variant="outline" className="text-[11px] font-medium">
          {currentTask.scope === "personal"
            ? "Pessoal"
            : currentTask.scope === "department"
              ? `Departamento: ${currentTask.department?.name ?? "Equipe"}`
              : "Toda a Igreja"}
        </Badge>

        <Badge
          variant={isCompleted ? "default" : "secondary"}
          className={cn(
            "text-[11px] font-medium",
            isCompleted && "bg-emerald-600 hover:bg-emerald-600 text-white",
          )}
        >
          {getStatusLabel(currentTask.status)}
        </Badge>

        {currentTask.priority !== "none" && (
          <Badge
            variant="outline"
            className={cn("text-[11px] font-medium", priorityColor[currentTask.priority])}
          >
            Prioridade {getPriorityLabel(currentTask.priority)}
          </Badge>
        )}

        {currentTask.isPinned && (
          <Badge
            variant="outline"
            className="gap-1 border-primary/30 bg-primary/5 text-primary text-[11px]"
          >
            <PinIcon className="size-3 fill-primary" />
            Fixada
          </Badge>
        )}

        {currentTask.isRecurring && (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-[11px]"
          >
            <RepeatIcon className="size-3" />
            Recorrente
          </Badge>
        )}
      </div>

      {/* Menu de Ações (Desktop: Dropdown, Mobile: Drawer) */}
      <TaskActionsMenu
        task={currentTask}
        onEdit={(t) => {
          onClose();
          onEdit(t);
        }}
        onOpenAudit={(t) => onOpenAudit(t)}
        onDelete={(taskId) => {
          onClose();
          onDelete?.(taskId);
        }}
        onPinToggled={(isPinned) => {
          const updated = { ...currentTask, isPinned };
          setCurrentTask(updated);
          onTaskUpdated?.(updated);
        }}
        canManage={canManage}
        triggerClassName="size-8 text-muted-foreground hover:text-foreground shrink-0 rounded-md -mt-1"
        isNestedInDrawer={isMobile}
      />
    </div>
  );

  const mainDetails = (
    <>
      {/* Grid de Metadados: Responsável, Datas e Criador (se tarefa delegada) */}
      <div
        className={cn(
          "grid gap-3 rounded-xl border bg-muted/20 p-3.5 sm:p-4 text-xs",
          showCreatedBy
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-3",
        )}
      >
        {/* Responsável */}
        <div className="space-y-1 min-w-0">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Responsável
          </span>
          <div className="flex items-center gap-2 pt-0.5 min-w-0">
            {currentTask.assignee ? (
              <>
                <Avatar className="size-6 shrink-0">
                  <AvatarImage src={currentTask.assignee.image ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(currentTask.assignee.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 truncate">
                  <p className="font-medium text-foreground truncate">
                    {currentTask.assignee.name ?? "Membro"}
                  </p>
                  {currentTask.assignee.email && (
                    <p
                      className="text-[11px] text-muted-foreground truncate"
                      title={currentTask.assignee.email}
                    >
                      {currentTask.assignee.email}
                    </p>
                  )}
                </div>
              </>
            ) : currentTask.assigneePerson ? (
              <>
                <Avatar className="size-6 shrink-0">
                  <AvatarImage src={currentTask.assigneePerson.image ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(currentTask.assigneePerson.name || "P")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 truncate">
                  <p className="font-medium text-foreground truncate">
                    {currentTask.assigneePerson.name}
                  </p>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground italic">Não atribuído</span>
            )}
          </div>
        </div>

        {/* Criado por (Visível apenas para tarefas delegadas / criadas por terceiros) */}
        {showCreatedBy && currentTask.createdBy && (
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Criado por
            </span>
            <div className="flex items-center gap-2 pt-0.5 min-w-0">
              <Avatar className="size-6 shrink-0">
                <AvatarImage src={currentTask.createdBy.image ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(currentTask.createdBy.name || "U")}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium text-foreground truncate">
                {currentTask.createdBy.name ?? "Usuário"}
              </p>
            </div>
          </div>
        )}

        {/* Quando (Início) */}
        <div className="space-y-1 min-w-0">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <CalendarDaysIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
            Quando trabalhar
          </span>
          <p className="font-medium text-foreground pt-0.5 truncate">
            {whenText ?? "Nenhuma data definida"}
          </p>
        </div>

        {/* Prazo Limite (Deadline) */}
        <div className="space-y-1 min-w-0">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <ClockIcon className="size-3 text-amber-600 dark:text-amber-400" />
            Prazo limite
          </span>
          <div className="pt-0.5 flex items-center gap-1.5 min-w-0">
            {deadlineInfo ? (
              <span
                className={cn(
                  "font-medium truncate",
                  deadlineInfo.isOverdue
                    ? "text-destructive font-semibold"
                    : "text-foreground",
                )}
              >
                {deadlineInfo.label}
                {deadlineInfo.isOverdue && " (Atrasada)"}
              </span>
            ) : (
              <span className="text-muted-foreground">Sem prazo definido</span>
            )}
          </div>
        </div>
      </div>

      {/* Tags e Link Anexo */}
      {((Array.isArray(currentTask.tags) && currentTask.tags.length > 0) ||
        currentTask.url) && (
        <div className="space-y-2 pt-0.5">
          {Array.isArray(currentTask.tags) && currentTask.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <TagIcon className="size-3.5 text-muted-foreground" />
              {currentTask.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground/80"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {currentTask.url && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Link anexo:</span>
              <a
                href={currentTask.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline max-w-[280px] sm:max-w-md truncate"
              >
                <span className="truncate">{currentTask.url}</span>
                <ExternalLinkIcon className="size-3 shrink-0" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Barra de Ações Inferior */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="h-9 sm:h-8"
        >
          Fechar
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isCompleted ? "outline" : "default"}
            size="sm"
            onClick={handleToggleComplete}
            disabled={isPending}
            className={cn(
              "gap-1.5 font-medium h-9 sm:h-8 flex-1 sm:flex-initial",
              !isCompleted && "bg-emerald-600 hover:bg-emerald-700 text-white",
            )}
          >
            {isCompleted ? (
              <>
                <ClockIcon className="size-3.5" />
                Reabrir
              </>
            ) : (
              <>
                <CheckIcon className="size-3.5 stroke-[3]" />
                Concluir
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              onClose();
              onEdit(currentTask);
            }}
            className="gap-1.5 font-semibold h-9 sm:h-8 flex-1 sm:flex-initial"
          >
            <PencilIcon className="size-3.5" />
            Editar
          </Button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <DrawerHeader className="border-b px-5 pt-4 pb-3.5 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left space-y-2">
          {badgesAndMenu}

          <div className="space-y-1">
            <DrawerTitle
              className={cn(
                "font-heading text-lg font-semibold tracking-tight text-foreground leading-snug break-words text-left",
                isCompleted && "line-through text-muted-foreground",
              )}
            >
              {currentTask.title}
            </DrawerTitle>

            {currentTask.description ? (
              <DrawerDescription className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap text-left pt-0.5">
                {currentTask.description}
              </DrawerDescription>
            ) : (
              <DrawerDescription className="sr-only">
                Detalhes da tarefa
              </DrawerDescription>
            )}
          </div>
        </DrawerHeader>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4 pb-6 space-y-4 [-webkit-overflow-scrolling:touch]">
          {mainDetails}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <DialogHeader className="space-y-2.5 border-b pb-4 text-left">
        {badgesAndMenu}

        <div className="space-y-1.5">
          <DialogTitle
            className={cn(
              "font-heading text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-snug break-words text-left",
              isCompleted && "line-through text-muted-foreground",
            )}
          >
            {currentTask.title}
          </DialogTitle>

          {currentTask.description ? (
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap text-left pt-0.5">
              {currentTask.description}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              Detalhes da tarefa
            </DialogDescription>
          )}
        </div>
      </DialogHeader>

      <div className="space-y-4">
        {mainDetails}
      </div>
    </div>
  );
}
