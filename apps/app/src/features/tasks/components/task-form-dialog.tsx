"use client";

import { useMemo, useRef, useState } from "react";
import {
  BellRingIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChurchIcon,
  ClockIcon,
  HistoryIcon,
  LinkIcon,
  Loader2Icon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

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
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { createTaskAction, updateTaskAction } from "../actions/tasks.actions";
import {
  buildRecurrenceRule,
  formatDateTimeLocalInput,
  getQuickDeadlineInput,
  parseRecurrenceRule,
} from "../lib/task-helpers";
import type {
  DelegationType,
  TaskItem,
  TaskPriority,
  TaskScope,
  TaskStatus,
} from "../services/tasks-service";
import { TaskAuditHistoryDialog } from "./task-audit-history-dialog";

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

type TaskFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (task?: TaskItem, createdCount?: number) => void;
  taskToEdit?: TaskItem | null;
  departments?: DepartmentOption[];
  members?: MemberOption[];
  currentUserId?: string;
  canDelegateDepartment?: boolean;
  canDelegateChurch?: boolean;
  defaultScope?: TaskScope;
  defaultDepartmentId?: string | null;
  defaultStatus?: TaskStatus;
  nested?: boolean;
};

type TargetType = "self" | "member" | "department" | "church";
type DeadlinePreset = "none" | "today" | "tomorrow" | "sunday" | "custom";

export function TaskFormDialog({
  open,
  onClose,
  onSuccess,
  taskToEdit = null,
  departments = [],
  members = [],
  currentUserId,
  canDelegateDepartment = false,
  canDelegateChurch = false,
  defaultScope = "personal",
  defaultDepartmentId = null,
  defaultStatus = "todo",
  nested = false,
}: TaskFormDialogProps) {
  const isMobile = useIsMobile();
  const isEditing = Boolean(taskToEdit);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [auditOpen, setAuditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    assigneeId?: string;
    departmentId?: string;
    url?: string;
  }>({});

  // Campos principais
  const [title, setTitle] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("self");
  const [departmentId, setDepartmentId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [delegationType, setDelegationType] = useState<DelegationType>("shared");

  // Prazo rápido e data
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>("none");
  const [deadline, setDeadline] = useState("");
  const [date, setDate] = useState("");

  // Detalhes recolhíveis (Progressive Disclosure)
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [url, setUrl] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState("3");
  const [recurrenceTime, setRecurrenceTime] = useState("09:00");

  // Sincroniza o estado sempre que abrir ou trocar de tarefa (render-phase para evitar efeito cascata)
  const formSyncKey = open
    ? `open:${taskToEdit?.id ?? "new"}:${defaultScope}:${defaultDepartmentId ?? ""}`
    : "closed";
  const [prevFormSyncKey, setPrevFormSyncKey] = useState(formSyncKey);

  if (formSyncKey !== prevFormSyncKey) {
    setPrevFormSyncKey(formSyncKey);
    if (open) {
      setSubmitError(null);
      setFieldErrors({});
      setMemberSearch("");
      setTagInput("");

      if (taskToEdit) {
        setTitle(taskToEdit.title ?? "");
        setDescription(taskToEdit.description ?? "");
        setDate(formatDateTimeLocalInput(taskToEdit.date));
        const formattedDeadline = formatDateTimeLocalInput(taskToEdit.deadline);
        setDeadline(formattedDeadline);
        setDeadlinePreset(formattedDeadline ? "custom" : "none");
        setPriority((taskToEdit.priority as TaskPriority) ?? "none");
        setTags(taskToEdit.tags ?? []);
        setUrl(taskToEdit.url ?? "");
        setIsPinned(Boolean(taskToEdit.isPinned));

        const parsedRecurrence = parseRecurrenceRule(taskToEdit.recurrenceRule);
        setIsRecurring(Boolean(taskToEdit.isRecurring));
        setRecurrenceDay(parsedRecurrence.day);
        setRecurrenceTime(parsedRecurrence.time);

        if (taskToEdit.scope === "organization") {
          setTargetType("church");
        } else if (taskToEdit.scope === "department") {
          setTargetType("department");
        } else if (
          taskToEdit.assigneeId &&
          taskToEdit.assigneeId !== currentUserId
        ) {
          setTargetType("member");
        } else {
          setTargetType("self");
        }

        setDepartmentId(taskToEdit.departmentId ?? "");
        setAssigneeId(taskToEdit.assigneeId ?? "");
        setDelegationType(
          (taskToEdit.delegationType as DelegationType) ?? "shared",
        );

        const hasExtraDetails = Boolean(
          taskToEdit.description ||
            taskToEdit.date ||
            (taskToEdit.tags && taskToEdit.tags.length > 0) ||
            taskToEdit.url ||
            (taskToEdit.priority && taskToEdit.priority !== "none") ||
            taskToEdit.isPinned ||
            taskToEdit.isRecurring,
        );
        setShowMore(hasExtraDetails);
      } else {
        setTitle("");
        setDescription("");
        setDate("");
        setDeadline("");
        setDeadlinePreset("none");
        setPriority("none");
        setTags([]);
        setUrl("");
        setIsPinned(false);
        setIsRecurring(false);
        setRecurrenceDay("3");
        setRecurrenceTime("09:00");

        if (
          defaultScope === "department" &&
          canDelegateDepartment &&
          departments.length > 0
        ) {
          setTargetType("department");
          setDepartmentId(defaultDepartmentId ?? departments[0]?.id ?? "");
        } else if (defaultScope === "organization" && canDelegateChurch) {
          setTargetType("church");
          setDepartmentId("");
        } else {
          setTargetType("self");
          setDepartmentId(defaultDepartmentId ?? departments[0]?.id ?? "");
        }
        setAssigneeId("");
        setDelegationType("shared");
        setShowMore(false);
      }
    }
  }

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)),
    );
  }, [members, memberSearch]);

  const handleSelectDeadlinePreset = (preset: DeadlinePreset) => {
    setDeadlinePreset(preset);
    if (preset === "none") {
      setDeadline("");
    } else if (preset === "today" || preset === "tomorrow" || preset === "sunday") {
      setDeadline(getQuickDeadlineInput(preset));
    }
  };

  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setTags((prev) => prev.filter((item) => item !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors: typeof fieldErrors = {};

    if (!title.trim()) {
      nextErrors.title = "Informe um título para a tarefa.";
    }
    if (targetType === "member" && !assigneeId) {
      nextErrors.assigneeId = "Selecione quem ficará responsável por esta tarefa.";
    }
    if (targetType === "department" && !departmentId) {
      nextErrors.departmentId = "Selecione o departamento responsável.";
    }
    if (url.trim()) {
      try {
        new URL(url.trim());
      } catch {
        nextErrors.url = "Informe um endereço válido (começando com https://).";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      if (nextErrors.title) {
        titleInputRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      let resolvedScope: TaskScope = "personal";
      let resolvedDeptId: string | null = null;
      let resolvedAssigneeId: string | null = currentUserId ?? null;
      let resolvedAssigneePersonId: string | null = null;
      let resolvedDelegationType: DelegationType = "single";

      if (targetType === "church") {
        resolvedScope = "organization";
        resolvedAssigneeId = null;
      } else if (targetType === "department") {
        resolvedScope = "department";
        resolvedDeptId = departmentId;
        resolvedDelegationType = delegationType;
        resolvedAssigneeId = null;
      } else if (targetType === "member") {
        resolvedScope = "personal";
        resolvedAssigneeId = assigneeId;
        const memberMatch = members.find((m) => m.userId === assigneeId);
        resolvedAssigneePersonId = memberMatch?.personId ?? null;
      }

      const recurrenceRule = isRecurring
        ? buildRecurrenceRule(recurrenceDay, recurrenceTime)
        : null;

      const payload = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        date: date ? new Date(date).toISOString() : null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        tags,
        isPinned,
        priority,
        url: url.trim() ? url.trim() : null,
        scope: resolvedScope,
        departmentId: resolvedDeptId,
        assigneeId: resolvedAssigneeId,
        assigneePersonId: resolvedAssigneePersonId,
        delegationType: resolvedDelegationType,
        isRecurring,
        recurrenceRule,
      };

      if (isEditing && taskToEdit) {
        const res = await updateTaskAction(taskToEdit.id, payload);
        if (res.ok) {
          toast.success("Tarefa atualizada.");
          onSuccess?.(res.data.task, 1);
          onClose();
        } else {
          setSubmitError(res.error);
          toast.error(res.error);
        }
      } else {
        const res = await createTaskAction({
          ...payload,
          status: defaultStatus,
        });
        if (res.ok) {
          toast.success(
            res.data.createdCount > 1
              ? `Tarefa delegada para ${res.data.createdCount - 1} membros do departamento.`
              : "Tarefa criada.",
          );
          onSuccess?.(res.data.task, res.data.createdCount);
          onClose();
        } else {
          setSubmitError(res.error);
          toast.error(res.error);
        }
      }
    } catch {
      const msg = "Não foi possível salvar a tarefa. Tente novamente.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canChooseMember = members.length > 0;
  const canChooseDepartment = canDelegateDepartment && departments.length > 0;
  const canChooseChurch = canDelegateChurch;
  const showTargetSelector =
    canChooseMember || canChooseDepartment || canChooseChurch;

  const formBody = (
    <form
      id="task-editor-form"
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      {submitError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {submitError}
        </div>
      ) : null}

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title">
          O que precisa ser feito? <span className="text-destructive">*</span>
        </Label>
        <Input
          ref={titleInputRef}
          id="task-title"
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (fieldErrors.title) {
              setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }
          }}
          placeholder="Ex: Revisar lista de músicas do culto de domingo"
          aria-invalid={fieldErrors.title ? "true" : undefined}
          aria-describedby={fieldErrors.title ? "task-title-error" : undefined}
          className="min-h-[44px]"
          required
        />
        {fieldErrors.title ? (
          <p id="task-title-error" className="text-xs text-destructive">
            {fieldErrors.title}
          </p>
        ) : null}
      </div>

      {/* Para quem (Público / Delegação) */}
      {showTargetSelector ? (
        <fieldset className="space-y-2.5 rounded-xl border bg-muted/20 p-3">
          <legend className="px-1 text-xs font-semibold text-foreground">
            Para quem é esta tarefa?
          </legend>

          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant={targetType === "self" ? "default" : "outline"}
              size="sm"
              className="min-h-[40px] justify-start gap-1.5 sm:min-h-[36px]"
              onClick={() => {
                setTargetType("self");
                setFieldErrors((p) => ({
                  ...p,
                  assigneeId: undefined,
                  departmentId: undefined,
                }));
              }}
            >
              <UserIcon className="size-3.5 shrink-0" />
              Só para mim
            </Button>

            {canChooseMember ? (
              <Button
                type="button"
                variant={targetType === "member" ? "default" : "outline"}
                size="sm"
                className="min-h-[40px] justify-start gap-1.5 sm:min-h-[36px]"
                onClick={() => {
                  setTargetType("member");
                  setFieldErrors((p) => ({ ...p, departmentId: undefined }));
                }}
              >
                <UserIcon className="size-3.5 shrink-0" />
                Outra pessoa
              </Button>
            ) : null}

            {canChooseDepartment ? (
              <Button
                type="button"
                variant={targetType === "department" ? "default" : "outline"}
                size="sm"
                className="min-h-[40px] justify-start gap-1.5 sm:min-h-[36px]"
                onClick={() => {
                  setTargetType("department");
                  if (!departmentId && departments[0]?.id) {
                    setDepartmentId(departments[0].id);
                  }
                  setFieldErrors((p) => ({ ...p, assigneeId: undefined }));
                }}
              >
                <UsersIcon className="size-3.5 shrink-0" />
                Departamento
              </Button>
            ) : null}

            {canChooseChurch ? (
              <Button
                type="button"
                variant={targetType === "church" ? "default" : "outline"}
                size="sm"
                className="min-h-[40px] justify-start gap-1.5 sm:min-h-[36px]"
                onClick={() => {
                  setTargetType("church");
                  setFieldErrors((p) => ({
                    ...p,
                    assigneeId: undefined,
                    departmentId: undefined,
                  }));
                }}
              >
                <ChurchIcon className="size-3.5 shrink-0" />
                Toda a igreja
              </Button>
            ) : null}
          </div>

          {targetType === "member" ? (
            <div className="space-y-2 pt-1">
              <Label htmlFor="task-assignee">Selecionar responsável</Label>
              {members.length > 8 ? (
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Buscar pessoa por nome..."
                    aria-label="Filtrar pessoas por nome"
                    className="min-h-[40px] pl-9"
                  />
                </div>
              ) : null}
              <NativeSelect
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, assigneeId: undefined }));
                }}
                aria-invalid={fieldErrors.assigneeId ? "true" : undefined}
                aria-describedby={
                  fieldErrors.assigneeId ? "task-assignee-error" : undefined
                }
                className="min-h-[44px] w-full"
              >
                <option value="">Escolha um membro...</option>
                {filteredMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
              {fieldErrors.assigneeId ? (
                <p id="task-assignee-error" className="text-xs text-destructive">
                  {fieldErrors.assigneeId}
                </p>
              ) : null}
            </div>
          ) : null}

          {targetType === "department" ? (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="task-department">Departamento</Label>
                <NativeSelect
                  id="task-department"
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      departmentId: undefined,
                    }));
                  }}
                  aria-invalid={fieldErrors.departmentId ? "true" : undefined}
                  className="min-h-[44px] w-full"
                >
                  <option value="">Escolha um departamento...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
                {fieldErrors.departmentId ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.departmentId}
                  </p>
                ) : null}
              </div>

              {!isEditing ? (
                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-foreground">
                    Como a equipe vai realizar?
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label
                      className={cn(
                        "flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors",
                        delegationType === "shared"
                          ? "border-primary bg-primary/5"
                          : "bg-background hover:bg-muted/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="delegationType"
                        checked={delegationType === "shared"}
                        onChange={() => setDelegationType("shared")}
                        className="mt-0.5 accent-primary"
                      />
                      <span>
                        <strong className="block font-medium text-foreground">
                          Em equipe
                        </strong>
                        <span className="text-muted-foreground">
                          Qualquer membro do departamento pode concluir
                        </span>
                      </span>
                    </label>

                    <label
                      className={cn(
                        "flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors",
                        delegationType === "individual"
                          ? "border-primary bg-primary/5"
                          : "bg-background hover:bg-muted/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="delegationType"
                        checked={delegationType === "individual"}
                        onChange={() => setDelegationType("individual")}
                        className="mt-0.5 accent-primary"
                      />
                      <span>
                        <strong className="block font-medium text-foreground">
                          Individual por pessoa
                        </strong>
                        <span className="text-muted-foreground">
                          Cria uma tarefa para cada integrante confirmar
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {/* Prazo rápido */}
      <div className="space-y-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <ClockIcon className="size-3.5 text-muted-foreground" />
          Prazo de entrega
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: "none", label: "Sem prazo" },
              { key: "today", label: "Hoje" },
              { key: "tomorrow", label: "Amanhã" },
              { key: "sunday", label: "Próx. domingo" },
              { key: "custom", label: "Escolher data" },
            ] as const
          ).map((chip) => (
            <Button
              key={chip.key}
              type="button"
              size="sm"
              variant={deadlinePreset === chip.key ? "default" : "outline"}
              className="min-h-[38px] sm:min-h-[32px]"
              onClick={() => handleSelectDeadlinePreset(chip.key)}
            >
              {chip.label}
            </Button>
          ))}
        </div>

        {(deadlinePreset !== "none" || deadline) && (
          <div className="pt-1">
            <Label htmlFor="task-deadline" className="text-xs text-muted-foreground">
              Data e hora limite
            </Label>
            <Input
              id="task-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                setDeadlinePreset(e.target.value ? "custom" : "none");
              }}
              className="mt-1 min-h-[44px]"
            />
          </div>
        )}
      </div>

      {/* Divulgação progressiva: Mais detalhes */}
      <div className="border-t pt-2">
        <button
          type="button"
          aria-expanded={showMore}
          aria-controls="task-more-details"
          onClick={() => setShowMore((prev) => !prev)}
          className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <span>Mais detalhes (observações, etiquetas, prioridade, repetição)</span>
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform",
              showMore && "rotate-180",
            )}
          />
        </button>

        {showMore ? (
          <div id="task-more-details" className="space-y-4 pt-3">
            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="task-description">Observações e orientações</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes, checklist rápido ou instruções para a equipe..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Data planejada */}
              <div className="space-y-1.5">
                <Label htmlFor="task-date" className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  Quando pretende iniciar
                </Label>
                <Input
                  id="task-date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>

              {/* Prioridade */}
              <div className="space-y-1.5">
                <Label htmlFor="task-priority">Prioridade</Label>
                <NativeSelect
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="min-h-[44px] w-full"
                >
                  <option value="none">Nenhuma</option>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta (urgente)</option>
                </NativeSelect>
              </div>
            </div>

            {/* Etiquetas */}
            <div className="space-y-1.5">
              <Label htmlFor="task-tag-input" className="flex items-center gap-1.5">
                <TagIcon className="size-3.5 text-muted-foreground" />
                Etiquetas
              </Label>
              <div className="flex gap-2">
                <Input
                  id="task-tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Ex: Culto, Compras, Som"
                  className="min-h-[44px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  aria-label="Adicionar etiqueta"
                  className="min-h-[44px] min-w-[44px] shrink-0"
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 pr-1 text-xs">
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        aria-label={`Remover etiqueta ${t}`}
                        className="rounded-full p-0.5 hover:bg-background/80"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Link de apoio */}
            <div className="space-y-1.5">
              <Label htmlFor="task-url" className="flex items-center gap-1.5">
                <LinkIcon className="size-3.5 text-muted-foreground" />
                Link de apoio (documento, música ou reunião)
              </Label>
              <Input
                id="task-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (fieldErrors.url) {
                    setFieldErrors((prev) => ({ ...prev, url: undefined }));
                  }
                }}
                placeholder="https://..."
                aria-invalid={fieldErrors.url ? "true" : undefined}
                aria-describedby={fieldErrors.url ? "task-url-error" : undefined}
                className="min-h-[44px]"
              />
              {fieldErrors.url ? (
                <p id="task-url-error" className="text-xs text-destructive">
                  {fieldErrors.url}
                </p>
              ) : null}
            </div>

            {/* Destaque & Repetição */}
            <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
              <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <PinIcon className="size-4 text-primary" />
                <span>Fixar tarefa no topo da lista</span>
              </label>

              <div className="space-y-2 border-t pt-2.5">
                <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  <BellRingIcon className="size-4 text-muted-foreground" />
                  <span>Repetir e enviar lembrete semanal</span>
                </label>

                {isRecurring ? (
                  <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="task-recurrence-day" className="text-xs">
                        Dia da semana
                      </Label>
                      <NativeSelect
                        id="task-recurrence-day"
                        value={recurrenceDay}
                        onChange={(e) => setRecurrenceDay(e.target.value)}
                        className="min-h-[40px] w-full"
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
                      <Label htmlFor="task-recurrence-time" className="text-xs">
                        Horário do lembrete
                      </Label>
                      <Input
                        id="task-recurrence-time"
                        type="time"
                        value={recurrenceTime}
                        onChange={(e) => setRecurrenceTime(e.target.value)}
                        className="min-h-[40px]"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );

  if (isMobile) {
    const Wrapper = nested ? DrawerNestedRoot : Drawer;
    return (
      <Wrapper open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="flex max-h-[85vh] flex-col px-4 pb-6">
          <DrawerHeader className="!text-left shrink-0 px-0">
            <div className="flex items-center justify-between gap-2">
              <DrawerTitle className="font-heading text-xl font-bold">
                {isEditing ? "Editar tarefa" : "Nova tarefa"}
              </DrawerTitle>
              {isEditing && taskToEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuditOpen(true)}
                  className="min-h-[44px] gap-1.5 text-muted-foreground"
                >
                  <HistoryIcon className="size-4" />
                  Histórico
                </Button>
              ) : null}
            </div>
            <DrawerDescription>
              {isEditing
                ? "Atualize os dados da tarefa abaixo."
                : "Organize uma atividade pessoal ou delegue para sua equipe."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] py-2 pr-1">
            {formBody}
          </div>

          <DrawerFooter className="shrink-0 border-t bg-background px-0 pt-3">
            <Button
              type="submit"
              form="task-editor-form"
              disabled={submitting}
              className="min-h-[44px] w-full"
            >
              {submitting ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                "Salvar alterações"
              ) : (
                "Criar tarefa"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
              className="min-h-[44px] w-full"
            >
              Cancelar
            </Button>
          </DrawerFooter>

          {isEditing && taskToEdit ? (
            <TaskAuditHistoryDialog
              task={taskToEdit}
              open={auditOpen}
              onClose={() => setAuditOpen(false)}
              members={members}
              departments={departments}
              nested
            />
          ) : null}
        </DrawerContent>
      </Wrapper>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="font-heading text-xl font-bold">
              {isEditing ? "Editar tarefa" : "Nova tarefa"}
            </DialogTitle>
            {isEditing && taskToEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAuditOpen(true)}
                className="gap-1.5 text-muted-foreground"
              >
                <HistoryIcon className="size-4" />
                Histórico
              </Button>
            ) : null}
          </div>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da tarefa."
              : "Crie um lembrete pessoal ou delegue para sua equipe."}
          </DialogDescription>
        </DialogHeader>

        {formBody}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" form="task-editor-form" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Salvando...
              </>
            ) : isEditing ? (
              "Salvar alterações"
            ) : (
              "Criar tarefa"
            )}
          </Button>
        </DialogFooter>

        {isEditing && taskToEdit ? (
          <TaskAuditHistoryDialog
            task={taskToEdit}
            open={auditOpen}
            onClose={() => setAuditOpen(false)}
            members={members}
            departments={departments}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
