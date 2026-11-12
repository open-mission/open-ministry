"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  HistoryIcon,
  MoreVerticalIcon,
  PencilIcon,
  PinIcon,
  RepeatIcon,
  TagIcon,
  Trash2Icon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
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
  getStatusLabel,
} from "../lib/task-utils";
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
          <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2Icon className="size-4" />
              </span>
              <DrawerTitle className="font-heading text-lg font-semibold tracking-tight">
                Detalhes da Tarefa
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground text-left mt-0.5">
              Consulte afazeres, prazos, responsável e histórico de execução.
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[75vh] overflow-y-auto px-5 py-4 pb-6 [-webkit-overflow-scrolling:touch]">
            <TaskDetailContent
              task={task}
              onClose={() => onOpenChange(false)}
              onEdit={onEdit}
              onOpenAudit={onOpenAudit}
              onDelete={onDelete}
              onTaskUpdated={onTaskUpdated}
              canManage={canManage}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[88vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckCircle2Icon className="size-4" />
            </span>
            <DialogTitle className="font-heading text-xl font-semibold tracking-tight">
              Detalhes da Tarefa
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Consulte afazeres, prazos, responsável e histórico de execução.
          </DialogDescription>
        </DialogHeader>

        <TaskDetailContent
          task={task}
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

function TaskDetailContent({
  task,
  onClose,
  onEdit,
  onOpenAudit,
  onDelete,
  onTaskUpdated,
  canManage = true,
}: {
  task: TaskItem;
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

  const handleTogglePin = () => {
    const nextPinned = !currentTask.isPinned;
    const optimisticTask: TaskItem = {
      ...currentTask,
      isPinned: nextPinned,
    };

    setCurrentTask(optimisticTask);
    onTaskUpdated?.(optimisticTask);

    startTransition(async () => {
      const res = await toggleTaskPinAction(currentTask.id);
      if (!res.ok) {
        toast.error(res.error || "Erro ao atualizar fixação");
        setCurrentTask(currentTask);
        onTaskUpdated?.(currentTask);
        return;
      }
      toast.success(nextPinned ? "Tarefa fixada no topo!" : "Tarefa desafixada.");
    });
  };

  const handleDelete = () => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    onClose();
    onDelete?.(currentTask.id);

    startTransition(async () => {
      const res = await deleteTaskAction(currentTask.id);
      if (!res.ok) {
        toast.error(res.error || "Erro ao excluir tarefa");
        return;
      }
      toast.success("Tarefa excluída.");
    });
  };

  const priorityColor: Record<TaskPriority, string> = {
    high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    none: "bg-muted text-muted-foreground border-transparent",
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Título, Badges e Menu de Ações (canto superior direito) */}
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {/* Badge de Escopo */}
            <Badge variant="outline" className="text-[11px] font-medium">
              {currentTask.scope === "personal"
                ? "Pessoal"
                : currentTask.scope === "department"
                  ? `Departamento: ${currentTask.department?.name ?? "Equipe"}`
                  : "Toda a Igreja"}
            </Badge>

            {/* Badge de Status */}
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className={cn(
                "text-[11px] font-medium",
                isCompleted && "bg-emerald-600 hover:bg-emerald-600 text-white",
              )}
            >
              {getStatusLabel(currentTask.status)}
            </Badge>

            {/* Badge de Prioridade */}
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

          {/* Menu Dropdown de Opções perto do título */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground shrink-0 rounded-md -mt-1"
                title="Mais opções da tarefa"
              >
                <MoreVerticalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem onClick={handleTogglePin} disabled={isPending}>
                <PinIcon className="mr-2 size-3.5" />
                {currentTask.isPinned ? "Desafixar do topo" : "Fixar no topo"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenAudit(currentTask)}>
                <HistoryIcon className="mr-2 size-3.5" />
                Histórico de Auditoria
              </DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isPending}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2Icon className="mr-2 size-3.5" />
                    Excluir Tarefa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3
          className={cn(
            "text-xl sm:text-2xl font-heading font-semibold text-foreground leading-snug break-words",
            isCompleted && "line-through text-muted-foreground",
          )}
        >
          {currentTask.title}
        </h3>
      </div>

      {/* Grid de Metadados: Responsável, Datas e Criador (se tarefa delegada) */}
      <div
        className={cn(
          "grid gap-3.5 rounded-xl border bg-muted/20 p-4 text-xs",
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

      {/* Descrição e Anotações */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Descrição / Anotações
        </span>
        <div className="rounded-lg border bg-card p-3.5 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[70px]">
          {currentTask.description ? (
            currentTask.description
          ) : (
            <p className="text-muted-foreground italic">
              Nenhuma anotação ou descrição fornecida para esta tarefa.
            </p>
          )}
        </div>
      </div>

      {/* Tags e URL */}
      {((Array.isArray(currentTask.tags) && currentTask.tags.length > 0) ||
        currentTask.url) && (
        <div className="space-y-2 pt-1">
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
    </div>
  );
}
