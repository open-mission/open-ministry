"use client";

import { useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { createTaskAction, updateTaskAction } from "../../actions/tasks.actions";
import {
  buildRecurrenceRule,
  formatDateTimeLocalInput,
  getQuickDeadlineInput,
  parseRecurrenceRule,
} from "../../lib/task-helpers";
import type {
  DelegationType,
  TaskItem,
  TaskPriority,
  TaskScope,
  TaskStatus,
} from "../../services/tasks-service";
import type {
  DeadlinePreset,
  DepartmentOption,
  MemberOption,
  TargetType,
  TaskFieldErrors,
  TaskFormFieldsState,
} from "./task-form.types";

type TaskFormReducerState = {
  auditOpen: boolean;
  submitting: boolean;
  submitError: string | null;
  fieldErrors: TaskFieldErrors;
  fields: TaskFormFieldsState;
};

const EMPTY_FIELDS: TaskFormFieldsState = {
  title: "",
  targetType: "self",
  departmentId: "",
  assigneeId: "",
  memberSearch: "",
  delegationType: "shared",
  deadlinePreset: "none",
  deadline: "",
  date: "",
  showMore: false,
  description: "",
  priority: "none",
  tags: [],
  tagInput: "",
  url: "",
  isPinned: false,
  isRecurring: false,
  recurrenceDay: "3",
  recurrenceTime: "09:00",
};

type SyncPayload = {
  taskToEdit: TaskItem | null;
  currentUserId?: string;
  defaultScope: TaskScope;
  defaultDepartmentId: string | null;
  canDelegateDepartment: boolean;
  canDelegateChurch: boolean;
  departments: DepartmentOption[];
};

type TaskFormAction =
  | { type: "sync"; payload: SyncPayload }
  | {
      type: "setField";
      field: keyof TaskFormFieldsState;
      value: TaskFormFieldsState[keyof TaskFormFieldsState];
    }
  | { type: "clearFieldErrors"; keys: Array<keyof TaskFieldErrors> }
  | { type: "setFieldErrors"; errors: TaskFieldErrors }
  | { type: "setAuditOpen"; open: boolean }
  | { type: "setSubmitting"; submitting: boolean }
  | { type: "setSubmitError"; error: string | null }
  | { type: "selectDeadlinePreset"; preset: DeadlinePreset }
  | { type: "addTag" }
  | { type: "removeTag"; tag: string };

function buildSyncedFields(payload: SyncPayload): TaskFormFieldsState {
  const {
    taskToEdit,
    currentUserId,
    defaultScope,
    defaultDepartmentId,
    canDelegateDepartment,
    canDelegateChurch,
    departments,
  } = payload;

  if (!taskToEdit) {
    let targetType: TargetType = "self";
    let departmentId = defaultDepartmentId ?? departments[0]?.id ?? "";

    if (
      defaultScope === "department" &&
      canDelegateDepartment &&
      departments.length > 0
    ) {
      targetType = "department";
    } else if (defaultScope === "organization" && canDelegateChurch) {
      targetType = "church";
      departmentId = "";
    }

    return {
      ...EMPTY_FIELDS,
      targetType,
      departmentId,
    };
  }

  const formattedDeadline = formatDateTimeLocalInput(taskToEdit.deadline);
  const parsedRecurrence = parseRecurrenceRule(taskToEdit.recurrenceRule);

  let targetType: TargetType = "self";
  if (taskToEdit.scope === "organization") {
    targetType = "church";
  } else if (taskToEdit.scope === "department") {
    targetType = "department";
  } else if (taskToEdit.assigneeId && taskToEdit.assigneeId !== currentUserId) {
    targetType = "member";
  }

  const hasExtraDetails = Boolean(
    taskToEdit.description ||
      taskToEdit.date ||
      (taskToEdit.tags && taskToEdit.tags.length > 0) ||
      taskToEdit.url ||
      (taskToEdit.priority && taskToEdit.priority !== "none") ||
      taskToEdit.isPinned ||
      taskToEdit.isRecurring,
  );

  return {
    title: taskToEdit.title ?? "",
    targetType,
    departmentId: taskToEdit.departmentId ?? "",
    assigneeId: taskToEdit.assigneeId ?? "",
    memberSearch: "",
    delegationType: (taskToEdit.delegationType as DelegationType) ?? "shared",
    deadlinePreset: formattedDeadline ? "custom" : "none",
    deadline: formattedDeadline,
    date: formatDateTimeLocalInput(taskToEdit.date),
    showMore: hasExtraDetails,
    description: taskToEdit.description ?? "",
    priority: (taskToEdit.priority as TaskPriority) ?? "none",
    tags: taskToEdit.tags ?? [],
    tagInput: "",
    url: taskToEdit.url ?? "",
    isPinned: Boolean(taskToEdit.isPinned),
    isRecurring: Boolean(taskToEdit.isRecurring),
    recurrenceDay: parsedRecurrence.day,
    recurrenceTime: parsedRecurrence.time,
  };
}

function taskFormReducer(
  state: TaskFormReducerState,
  action: TaskFormAction,
): TaskFormReducerState {
  switch (action.type) {
    case "sync":
      return {
        ...state,
        submitError: null,
        fieldErrors: {},
        fields: buildSyncedFields(action.payload),
      };
    case "setField":
      return {
        ...state,
        fields: { ...state.fields, [action.field]: action.value },
      };
    case "clearFieldErrors": {
      const next = { ...state.fieldErrors };
      for (const key of action.keys) {
        delete next[key];
      }
      return { ...state, fieldErrors: next };
    }
    case "setFieldErrors":
      return { ...state, fieldErrors: action.errors };
    case "setAuditOpen":
      return { ...state, auditOpen: action.open };
    case "setSubmitting":
      return { ...state, submitting: action.submitting };
    case "setSubmitError":
      return { ...state, submitError: action.error };
    case "selectDeadlinePreset": {
      const nextDeadline =
        action.preset === "none"
          ? ""
          : action.preset === "today" ||
              action.preset === "tomorrow" ||
              action.preset === "sunday"
            ? getQuickDeadlineInput(action.preset)
            : state.fields.deadline;
      return {
        ...state,
        fields: {
          ...state.fields,
          deadlinePreset: action.preset,
          deadline: nextDeadline,
        },
      };
    }
    case "addTag": {
      const clean = state.fields.tagInput.trim();
      if (!clean) return state;
      const nextTags = state.fields.tags.includes(clean)
        ? state.fields.tags
        : [...state.fields.tags, clean];
      return {
        ...state,
        fields: { ...state.fields, tags: nextTags, tagInput: "" },
      };
    }
    case "removeTag":
      return {
        ...state,
        fields: {
          ...state.fields,
          tags: state.fields.tags.filter((item) => item !== action.tag),
        },
      };
  }
}

type UseTaskFormParams = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (task?: TaskItem, createdCount?: number) => void;
  taskToEdit: TaskItem | null;
  departments: DepartmentOption[];
  members: MemberOption[];
  currentUserId?: string;
  canDelegateDepartment: boolean;
  canDelegateChurch: boolean;
  defaultScope: TaskScope;
  defaultDepartmentId: string | null;
  defaultStatus: TaskStatus;
};

export function useTaskForm({
  open,
  onClose,
  onSuccess,
  taskToEdit,
  departments,
  members,
  currentUserId,
  canDelegateDepartment,
  canDelegateChurch,
  defaultScope,
  defaultDepartmentId,
  defaultStatus,
}: UseTaskFormParams) {
  const isEditing = Boolean(taskToEdit);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useReducer(taskFormReducer, {
    auditOpen: false,
    submitting: false,
    submitError: null,
    fieldErrors: {},
    fields: EMPTY_FIELDS,
  });

  // Sincroniza o estado sempre que abrir ou trocar de tarefa (render-phase para evitar efeito cascata)
  const formSyncKey = open
    ? `open:${taskToEdit?.id ?? "new"}:${defaultScope}:${defaultDepartmentId ?? ""}`
    : "closed";
  const [prevFormSyncKey, setPrevFormSyncKey] = useState(formSyncKey);

  if (formSyncKey !== prevFormSyncKey) {
    setPrevFormSyncKey(formSyncKey);
    if (open) {
      dispatch({
        type: "sync",
        payload: {
          taskToEdit,
          currentUserId,
          defaultScope,
          defaultDepartmentId,
          canDelegateDepartment,
          canDelegateChurch,
          departments,
        },
      });
    }
  }

  const filteredMembers = useMemo(() => {
    const q = state.fields.memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)),
    );
  }, [members, state.fields.memberSearch]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    dispatch({ type: "setSubmitError", error: null });

    const { fields } = state;
    const nextErrors: TaskFieldErrors = {};

    if (!fields.title.trim()) {
      nextErrors.title = "Informe um título para a tarefa.";
    }
    if (fields.targetType === "member" && !fields.assigneeId) {
      nextErrors.assigneeId =
        "Selecione quem ficará responsável por esta tarefa.";
    }
    if (fields.targetType === "department" && !fields.departmentId) {
      nextErrors.departmentId = "Selecione o departamento responsável.";
    }
    if (fields.url.trim()) {
      try {
        new URL(fields.url.trim());
      } catch {
        nextErrors.url =
          "Informe um endereço válido (começando com https://).";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      dispatch({ type: "setFieldErrors", errors: nextErrors });
      if (nextErrors.title) {
        titleInputRef.current?.focus();
      }
      return;
    }

    dispatch({ type: "setFieldErrors", errors: {} });
    dispatch({ type: "setSubmitting", submitting: true });

    try {
      let resolvedScope: TaskScope = "personal";
      let resolvedDeptId: string | null = null;
      let resolvedAssigneeId: string | null = currentUserId ?? null;
      let resolvedAssigneePersonId: string | null = null;
      let resolvedDelegationType: DelegationType = "single";

      if (fields.targetType === "church") {
        resolvedScope = "organization";
        resolvedAssigneeId = null;
      } else if (fields.targetType === "department") {
        resolvedScope = "department";
        resolvedDeptId = fields.departmentId;
        resolvedDelegationType = fields.delegationType;
        resolvedAssigneeId = null;
      } else if (fields.targetType === "member") {
        resolvedScope = "personal";
        resolvedAssigneeId = fields.assigneeId;
        const memberMatch = members.find(
          (m) => m.userId === fields.assigneeId,
        );
        resolvedAssigneePersonId = memberMatch?.personId ?? null;
      }

      const recurrenceRule = fields.isRecurring
        ? buildRecurrenceRule(fields.recurrenceDay, fields.recurrenceTime)
        : null;

      const payload = {
        title: fields.title.trim(),
        description: fields.description.trim() ? fields.description.trim() : null,
        date: fields.date ? new Date(fields.date).toISOString() : null,
        deadline: fields.deadline
          ? new Date(fields.deadline).toISOString()
          : null,
        tags: fields.tags,
        isPinned: fields.isPinned,
        priority: fields.priority,
        url: fields.url.trim() ? fields.url.trim() : null,
        scope: resolvedScope,
        departmentId: resolvedDeptId,
        assigneeId: resolvedAssigneeId,
        assigneePersonId: resolvedAssigneePersonId,
        delegationType: resolvedDelegationType,
        isRecurring: fields.isRecurring,
        recurrenceRule,
      };

      if (isEditing && taskToEdit) {
        const res = await updateTaskAction(taskToEdit.id, payload);
        if (res.ok) {
          toast.success("Tarefa atualizada.");
          onSuccess?.(res.data.task, 1);
          onClose();
        } else {
          dispatch({ type: "setSubmitError", error: res.error });
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
          dispatch({ type: "setSubmitError", error: res.error });
          toast.error(res.error);
        }
      }
    } catch {
      const msg = "Não foi possível salvar a tarefa. Tente novamente.";
      dispatch({ type: "setSubmitError", error: msg });
      toast.error(msg);
    } finally {
      dispatch({ type: "setSubmitting", submitting: false });
    }
  };

  return {
    isEditing,
    titleInputRef,
    auditOpen: state.auditOpen,
    submitting: state.submitting,
    submitError: state.submitError,
    fieldErrors: state.fieldErrors,
    fields: state.fields,
    filteredMembers,
    setAuditOpen: (openNext: boolean) =>
      dispatch({ type: "setAuditOpen", open: openNext }),
    setField: <K extends keyof TaskFormFieldsState>(
      field: K,
      value: TaskFormFieldsState[K],
    ) => dispatch({ type: "setField", field, value }),
    clearFieldErrors: (keys: Array<keyof TaskFieldErrors>) =>
      dispatch({ type: "clearFieldErrors", keys }),
    handleSelectDeadlinePreset: (preset: DeadlinePreset) =>
      dispatch({ type: "selectDeadlinePreset", preset }),
    handleAddTag: () => dispatch({ type: "addTag" }),
    handleRemoveTag: (tag: string) => dispatch({ type: "removeTag", tag }),
    handleSubmit,
  };
}
