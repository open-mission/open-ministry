"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarDaysIcon,
  CheckSquare2Icon,
  ClockIcon,
  FlagIcon,
  HistoryIcon,
  LinkIcon,
  PinIcon,
  RepeatIcon,
  TagIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createTaskAction, updateTaskAction } from "../actions/tasks.actions";
import { TaskAuditHistoryDialog } from "./task-audit-history-dialog";
import type {
  DelegationType,
  TaskItem,
  TaskPriority,
  TaskScope,
} from "../services/tasks-service";

type DepartmentOption = {
  id: string;
  name: string;
};

type MemberOption = {
  userId: string;
  personId?: string;
  name: string;
  email?: string | null;
};

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit?: TaskItem | null;
  departments?: DepartmentOption[];
  members?: MemberOption[];
  currentUserId?: string;
  canDelegateDepartment?: boolean;
  canDelegateChurch?: boolean;
  onTaskCreated?: (task: TaskItem, tempId?: string) => void;
  onTaskFailed?: (tempId: string) => void;
  onTaskUpdated?: (task: TaskItem) => void;
};

export function TaskFormDialog({
  open,
  onOpenChange,
  taskToEdit,
  departments = [],
  members = [],
  currentUserId,
  canDelegateDepartment = true,
  canDelegateChurch = false,
  onTaskCreated,
  onTaskFailed,
  onTaskUpdated,
}: TaskFormDialogProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {open && (
            <TaskFormContent
              key={taskToEdit?.id ?? "new"}
              taskToEdit={taskToEdit}
              departments={departments}
              members={members}
              currentUserId={currentUserId}
              canDelegateDepartment={canDelegateDepartment}
              canDelegateChurch={canDelegateChurch}
              onClose={() => onOpenChange(false)}
              onOpenHistory={() => setHistoryOpen(true)}
              onTaskCreated={onTaskCreated}
              onTaskFailed={onTaskFailed}
              onTaskUpdated={onTaskUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico de Auditoria */}
      <TaskAuditHistoryDialog
        task={taskToEdit ?? null}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}

function TaskFormContent({
  taskToEdit,
  departments = [],
  members = [],
  currentUserId,
  canDelegateDepartment = true,
  canDelegateChurch = false,
  onClose,
  onOpenHistory,
  onTaskCreated,
  onTaskFailed,
  onTaskUpdated,
}: {
  taskToEdit?: TaskItem | null;
  departments: DepartmentOption[];
  members: MemberOption[];
  currentUserId?: string;
  canDelegateDepartment: boolean;
  canDelegateChurch: boolean;
  onClose: () => void;
  onOpenHistory: () => void;
  onTaskCreated?: (task: TaskItem, tempId?: string) => void;
  onTaskFailed?: (tempId: string) => void;
  onTaskUpdated?: (task: TaskItem) => void;
}) {
  const isEditing = Boolean(taskToEdit);
  const [isPending, startTransition] = useTransition();

  // Initial values computed directly without effect
  const [title, setTitle] = useState(() => taskToEdit?.title ?? "");
  const [description, setDescription] = useState(
    () => taskToEdit?.description ?? "",
  );
  const [date, setDate] = useState(() =>
    taskToEdit?.date
      ? new Date(taskToEdit.date).toISOString().slice(0, 16)
      : "",
  );
  const [deadline, setDeadline] = useState(() =>
    taskToEdit?.deadline
      ? new Date(taskToEdit.deadline).toISOString().slice(0, 16)
      : "",
  );
  const [tags, setTags] = useState<string[]>(() =>
    Array.isArray(taskToEdit?.tags) ? taskToEdit.tags : [],
  );
  const [tagInput, setTagInput] = useState("");
  const [isPinned, setIsPinned] = useState(() => taskToEdit?.isPinned ?? false);
  const [priority, setPriority] = useState<TaskPriority>(
    () => (taskToEdit?.priority as TaskPriority) ?? "none",
  );
  const [url, setUrl] = useState(() => taskToEdit?.url ?? "");

  const [targetType, setTargetType] = useState<
    "self" | "member" | "department" | "church"
  >(() => {
    if (taskToEdit?.scope === "organization") return "church";
    if (taskToEdit?.departmentId) return "department";
    if (taskToEdit?.assigneeId && taskToEdit.assigneeId !== taskToEdit.createdById) {
      return "member";
    }
    return "self";
  });

  const [departmentId, setDepartmentId] = useState(
    () => taskToEdit?.departmentId ?? departments[0]?.id ?? "",
  );
  const [delegationType, setDelegationType] = useState<DelegationType>(
    () => (taskToEdit?.delegationType as DelegationType) ?? "shared",
  );
  const [assigneeId, setAssigneeId] = useState(
    () => taskToEdit?.assigneeId ?? "",
  );
  const [isRecurring, setIsRecurring] = useState(
    () => taskToEdit?.isRecurring ?? false,
  );
  const [recurrenceDay, setRecurrenceDay] = useState("3"); // 3 = Quarta
  const [recurrenceTime, setRecurrenceTime] = useState("09:00");

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }

    startTransition(async () => {
      let resolvedScope: TaskScope = "personal";
      let resolvedAssigneeId: string | null = null;
      let resolvedPersonId: string | null = null;
      let resolvedDeptId: string | null = null;
      let resolvedDelegationType: DelegationType = "single";

      if (targetType === "church") {
        resolvedScope = "organization";
      } else if (targetType === "department" && departmentId) {
        resolvedScope = "department";
        resolvedDeptId = departmentId;
        resolvedDelegationType = delegationType;
      } else if (targetType === "member" && assigneeId) {
        resolvedScope = "personal";
        resolvedAssigneeId = assigneeId;
        const member = members.find((m) => m.userId === assigneeId);
        resolvedPersonId = member?.personId ?? null;
      }

      const recurrenceRule = isRecurring
        ? `FREQ=WEEKLY;BYDAY=${recurrenceDay};BYTIME=${recurrenceTime}`
        : null;

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        date: date ? new Date(date).toISOString() : null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        tags,
        isPinned,
        priority,
        url: url.trim() || null,
        scope: resolvedScope,
        departmentId: resolvedDeptId,
        assigneeId: resolvedAssigneeId,
        assigneePersonId: resolvedPersonId,
        delegationType: resolvedDelegationType,
        isRecurring,
        recurrenceRule,
      };

      if (isEditing && taskToEdit) {
        // Atualização otimista imediata na interface
        const updatedOptimistic: TaskItem = {
          ...taskToEdit,
          ...payload,
          date: payload.date ? new Date(payload.date) : null,
          deadline: payload.deadline ? new Date(payload.deadline) : null,
          updatedAt: new Date(),
        };
        onTaskUpdated?.(updatedOptimistic);
        onClose();

        const res = await updateTaskAction(taskToEdit.id, payload);
        if (!res.ok) {
          toast.error(res.error);
          onTaskUpdated?.(taskToEdit); // rollback em caso de falha
        } else {
          toast.success("Tarefa atualizada com sucesso!");
          if (res.data?.task) {
            onTaskUpdated?.(res.data.task);
          }
        }
      } else {
        // Criação otimista instantânea (0ms de atraso)
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const assignedMember = members.find((m) => m.userId === resolvedAssigneeId);
        const assignedDept = departments.find((d) => d.id === resolvedDeptId);

        const optimisticTask: TaskItem = {
          id: tempId,
          organizationId: "",
          title: payload.title,
          description: payload.description,
          date: payload.date ? new Date(payload.date) : null,
          deadline: payload.deadline ? new Date(payload.deadline) : null,
          tags: payload.tags,
          isPinned: payload.isPinned,
          status: "todo",
          priority: payload.priority,
          url: payload.url,
          scope: payload.scope,
          departmentId: payload.departmentId,
          createdById: currentUserId ?? "",
          assigneeId: payload.assigneeId,
          assigneePersonId: payload.assigneePersonId,
          delegationType: payload.delegationType,
          parentTaskId: null,
          isRecurring: payload.isRecurring,
          recurrenceRule: payload.recurrenceRule,
          sortOrder: 0,
          completedAt: null,
          completedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: currentUserId ?? "",
            name: "Você",
            email: null,
            image: null,
          },
          assignee: assignedMember
            ? {
                id: assignedMember.userId,
                name: assignedMember.name,
                email: assignedMember.email ?? null,
                image: null,
              }
            : payload.scope === "personal"
              ? {
                  id: currentUserId ?? "",
                  name: "Você",
                  email: null,
                  image: null,
                }
              : null,
          assigneePerson: null,
          completedBy: null,
          department: assignedDept ? { id: assignedDept.id, name: assignedDept.name } : null,
        };

        // Insere imediatamente na interface
        onTaskCreated?.(optimisticTask, tempId);
        onClose();

        const res = await createTaskAction(payload);
        if (!res.ok) {
          toast.error(res.error);
          onTaskFailed?.(tempId);
        } else {
          const count = res.data?.createdCount ?? 1;
          toast.success(
            count > 1
              ? `${count} tarefas geradas para os membros da equipe!`
              : "Tarefa criada com sucesso!",
          );
          if (res.data?.task) {
            onTaskCreated?.(res.data.task, tempId);
          }
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <div className="flex items-center justify-between pr-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckSquare2Icon className="size-4" />
            </span>
            <DialogTitle>
              {isEditing ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </div>
          {isEditing && taskToEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={onOpenHistory}
            >
              <HistoryIcon className="size-3.5" />
              Auditoria
            </Button>
          ) : null}
        </div>
        <DialogDescription>
          Organize seu dia, planeje datas de execução e defina prazos ministeriais.
        </DialogDescription>
      </DialogHeader>

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Título *</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Estudar repertório de domingo ou Enviar sugestões"
          required
          autoFocus
        />
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label htmlFor="task-desc">Descrição / Anotações</Label>
        <Textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes adicionais, notas ou observações da tarefa..."
          rows={3}
        />
      </div>

      {/* Quando e Prazo Máximo (Things 3 style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-date" className="flex items-center gap-1.5 text-xs font-medium">
            <CalendarDaysIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Quando trabalhar (Início / Data)
          </Label>
          <Input
            id="task-date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-deadline" className="flex items-center gap-1.5 text-xs font-medium">
            <ClockIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
            Prazo limite (Deadline)
          </Label>
          <Input
            id="task-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="text-xs"
          />
        </div>
      </div>

      {/* Tags e URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs font-medium">
            <TagIcon className="size-3.5 text-muted-foreground" />
            Tags
          </Label>
          <div className="flex gap-1.5">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Adicionar tag..."
              className="text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTag}
              className="text-xs px-2.5"
            >
              +
            </Button>
          </div>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-foreground"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-url" className="flex items-center gap-1.5 text-xs font-medium">
            <LinkIcon className="size-3.5 text-muted-foreground" />
            Link de referência (URL)
          </Label>
          <Input
            id="task-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="text-xs"
          />
        </div>
      </div>

      {/* Prioridade e Fixar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center border-t pt-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-priority" className="flex items-center gap-1.5 text-xs font-medium">
            <FlagIcon className="size-3.5 text-muted-foreground" />
            Prioridade
          </Label>
          <NativeSelect
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="text-xs h-9"
          >
            <option value="none">Normal (sem prioridade)</option>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </NativeSelect>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/30">
          <div className="space-y-0.5">
            <Label htmlFor="task-pinned" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
              <PinIcon className="size-3.5 text-primary" />
              Fixar no topo
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Mantém a tarefa em destaque
            </p>
          </div>
          <Switch
            id="task-pinned"
            checked={isPinned}
            onCheckedChange={setIsPinned}
          />
        </div>
      </div>

      {/* Delegação & Atribuição */}
      <div className="space-y-2 border-t pt-3">
        <Label className="flex items-center gap-1.5 text-xs font-medium">
          <UsersIcon className="size-3.5 text-primary" />
          Destinatário / Delegação
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <Button
            type="button"
            variant={targetType === "self" ? "default" : "outline"}
            size="sm"
            onClick={() => setTargetType("self")}
            className="h-8 text-xs"
          >
            Para mim (Pessoal)
          </Button>
          {canDelegateDepartment ? (
            <Button
              type="button"
              variant={targetType === "department" ? "default" : "outline"}
              size="sm"
              onClick={() => setTargetType("department")}
              className="h-8 text-xs"
            >
              Departamento
            </Button>
          ) : null}
          <Button
            type="button"
            variant={targetType === "member" ? "default" : "outline"}
            size="sm"
            onClick={() => setTargetType("member")}
            className="h-8 text-xs"
          >
            Membro
          </Button>
          {canDelegateChurch ? (
            <Button
              type="button"
              variant={targetType === "church" ? "default" : "outline"}
              size="sm"
              onClick={() => setTargetType("church")}
              className="h-8 text-xs col-span-2 sm:col-span-1"
            >
              Toda a Igreja
            </Button>
          ) : null}
        </div>

        {/* Se delegar para departamento */}
        {targetType === "department" ? (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5 mt-2">
            <div className="space-y-1">
              <Label htmlFor="task-dept" className="text-xs">Selecione o Departamento</Label>
              <NativeSelect
                id="task-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="text-xs h-9"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Modo de Conclusão da Equipe</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 rounded border bg-background p-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delegationType"
                    checked={delegationType === "shared"}
                    onChange={() => setDelegationType("shared")}
                    className="size-3.5 text-primary"
                  />
                  <div>
                    <p className="font-medium text-[11px]">Compartilhada</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Uma tarefa única para toda a equipe dar baixa.
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-2 rounded border bg-background p-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delegationType"
                    checked={delegationType === "individual"}
                    onChange={() => setDelegationType("individual")}
                    className="size-3.5 text-primary"
                  />
                  <div>
                    <p className="font-medium text-[11px]">Individual</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Gera uma cópia para cada membro marcar a sua.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        ) : null}

        {/* Se delegar para membro individual */}
        {targetType === "member" ? (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1 mt-2">
            <Label htmlFor="task-member" className="text-xs">Selecione o Membro</Label>
            <NativeSelect
              id="task-member"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="text-xs h-9"
            >
              <option value="">Selecione um membro...</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} {m.email ? `(${m.email})` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>

      {/* Recorrência e Notificação Push */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/30">
          <div className="space-y-0.5">
            <Label htmlFor="task-recurring" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
              <RepeatIcon className="size-3.5 text-primary" />
              Tarefa Recorrente (Lembrete Semanal)
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Ex: estudar instrumento toda semana com push no celular
            </p>
          </div>
          <Switch
            id="task-recurring"
            checked={isRecurring}
            onCheckedChange={setIsRecurring}
          />
        </div>

        {isRecurring ? (
          <div className="rounded-lg border bg-muted/20 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="recurrence-day" className="text-xs">Dia da Semana</Label>
              <NativeSelect
                id="recurrence-day"
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(e.target.value)}
                className="text-xs h-9"
              >
                <option value="0">Domingo</option>
                <option value="1">Segunda-feira</option>
                <option value="2">Terça-feira</option>
                <option value="3">Quarta-feira</option>
                <option value="4">Quinta-feira</option>
                <option value="5">Sexta-feira</option>
                <option value="6">Sábado</option>
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label htmlFor="recurrence-time" className="text-xs">Horário do Push</Label>
              <Input
                id="recurrence-time"
                type="time"
                value={recurrenceTime}
                onChange={(e) => setRecurrenceTime(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        ) : null}
      </div>

      <DialogFooter className="border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar Alterações"
              : "Criar Tarefa"}
        </Button>
      </DialogFooter>
    </form>
  );
}
