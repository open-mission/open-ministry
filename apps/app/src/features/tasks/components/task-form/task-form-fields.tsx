"use client";

import type { FormEvent, RefObject } from "react";
import {
  BellRingIcon,
  CalendarIcon,
  ChevronDownIcon,
  LinkIcon,
  PinIcon,
  PlusIcon,
  TagIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "../../services/tasks-service";
import { TaskDeadlineSection } from "./task-deadline-section";
import type {
  DeadlinePreset,
  DepartmentOption,
  MemberOption,
  TaskFieldErrors,
  TaskFormFieldsState,
} from "./task-form.types";
import { TaskTargetFieldset } from "./task-target-fieldset";

type TaskFormFieldsProps = {
  isEditing: boolean;
  titleInputRef: RefObject<HTMLInputElement | null>;
  submitError: string | null;
  fieldErrors: TaskFieldErrors;
  fields: TaskFormFieldsState;
  departments: DepartmentOption[];
  members: MemberOption[];
  filteredMembers: MemberOption[];
  canDelegateDepartment: boolean;
  canDelegateChurch: boolean;
  onFieldChange: <K extends keyof TaskFormFieldsState>(
    field: K,
    value: TaskFormFieldsState[K],
  ) => void;
  onClearFieldErrors: (keys: Array<keyof TaskFieldErrors>) => void;
  onSelectDeadlinePreset: (preset: DeadlinePreset) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onSubmit: (e: FormEvent) => void;
};

export function TaskFormFields({
  isEditing,
  titleInputRef,
  submitError,
  fieldErrors,
  fields,
  departments,
  members,
  filteredMembers,
  canDelegateDepartment,
  canDelegateChurch,
  onFieldChange,
  onClearFieldErrors,
  onSelectDeadlinePreset,
  onAddTag,
  onRemoveTag,
  onSubmit,
}: TaskFormFieldsProps) {
  const canChooseMember = members.length > 0;
  const canChooseDepartment = canDelegateDepartment && departments.length > 0;
  const canChooseChurch = canDelegateChurch;
  const showTargetSelector =
    canChooseMember || canChooseDepartment || canChooseChurch;

  return (
    <form
      id="task-editor-form"
      onSubmit={onSubmit}
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
          value={fields.title}
          onChange={(e) => {
            onFieldChange("title", e.target.value);
            if (fieldErrors.title) {
              onClearFieldErrors(["title"]);
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
        <TaskTargetFieldset
          isEditing={isEditing}
          targetType={fields.targetType}
          departmentId={fields.departmentId}
          assigneeId={fields.assigneeId}
          memberSearch={fields.memberSearch}
          delegationType={fields.delegationType}
          departments={departments}
          members={members}
          filteredMembers={filteredMembers}
          canChooseMember={canChooseMember}
          canChooseDepartment={canChooseDepartment}
          canChooseChurch={canChooseChurch}
          fieldErrors={fieldErrors}
          onTargetTypeChange={(next) => onFieldChange("targetType", next)}
          onDepartmentIdChange={(id) => onFieldChange("departmentId", id)}
          onAssigneeIdChange={(id) => onFieldChange("assigneeId", id)}
          onMemberSearchChange={(q) => onFieldChange("memberSearch", q)}
          onDelegationTypeChange={(next) =>
            onFieldChange("delegationType", next)
          }
          onClearFieldErrors={onClearFieldErrors}
        />
      ) : null}

      {/* Prazo rápido */}
      <TaskDeadlineSection
        deadlinePreset={fields.deadlinePreset}
        deadline={fields.deadline}
        onSelectPreset={onSelectDeadlinePreset}
        onDeadlineChange={(value) => {
          onFieldChange("deadline", value);
          onFieldChange("deadlinePreset", value ? "custom" : "none");
        }}
      />

      {/* Divulgação progressiva: Mais detalhes */}
      <div className="border-t pt-2">
        <button
          type="button"
          aria-expanded={fields.showMore}
          aria-controls="task-more-details"
          onClick={() => onFieldChange("showMore", !fields.showMore)}
          className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <span>
            Mais detalhes (observações, etiquetas, prioridade, repetição)
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform",
              fields.showMore && "rotate-180",
            )}
          />
        </button>

        {fields.showMore ? (
          <div id="task-more-details" className="space-y-4 pt-3">
            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="task-description">
                Observações e orientações
              </Label>
              <Textarea
                id="task-description"
                value={fields.description}
                onChange={(e) => onFieldChange("description", e.target.value)}
                placeholder="Detalhes, checklist rápido ou instruções para a equipe..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-date" className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  Quando pretende iniciar
                </Label>
                <Input
                  id="task-date"
                  type="datetime-local"
                  value={fields.date}
                  onChange={(e) => onFieldChange("date", e.target.value)}
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-priority">Prioridade</Label>
                <NativeSelect
                  id="task-priority"
                  value={fields.priority}
                  onChange={(e) =>
                    onFieldChange("priority", e.target.value as TaskPriority)
                  }
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
              <Label
                htmlFor="task-tag-input"
                className="flex items-center gap-1.5"
              >
                <TagIcon className="size-3.5 text-muted-foreground" />
                Etiquetas
              </Label>
              <div className="flex gap-2">
                <Input
                  id="task-tag-input"
                  value={fields.tagInput}
                  onChange={(e) => onFieldChange("tagInput", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddTag();
                    }
                  }}
                  placeholder="Ex: Culto, Compras, Som"
                  className="min-h-[44px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={onAddTag}
                  aria-label="Adicionar etiqueta"
                  className="min-h-[44px] min-w-[44px] shrink-0"
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
              {fields.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {fields.tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="gap-1 pr-1 text-xs"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveTag(t)}
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
                value={fields.url}
                onChange={(e) => {
                  onFieldChange("url", e.target.value);
                  if (fieldErrors.url) {
                    onClearFieldErrors(["url"]);
                  }
                }}
                placeholder="https://..."
                aria-invalid={fieldErrors.url ? "true" : undefined}
                aria-describedby={
                  fieldErrors.url ? "task-url-error" : undefined
                }
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
                  checked={fields.isPinned}
                  onChange={(e) => onFieldChange("isPinned", e.target.checked)}
                  className="size-4 accent-primary"
                />
                <PinIcon className="size-4 text-primary" />
                <span>Fixar tarefa no topo da lista</span>
              </label>

              <div className="space-y-2 border-t pt-2.5">
                <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={fields.isRecurring}
                    onChange={(e) =>
                      onFieldChange("isRecurring", e.target.checked)
                    }
                    className="size-4 accent-primary"
                  />
                  <BellRingIcon className="size-4 text-muted-foreground" />
                  <span>Repetir e enviar lembrete semanal</span>
                </label>

                {fields.isRecurring ? (
                  <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="task-recurrence-day" className="text-xs">
                        Dia da semana
                      </Label>
                      <NativeSelect
                        id="task-recurrence-day"
                        value={fields.recurrenceDay}
                        onChange={(e) =>
                          onFieldChange("recurrenceDay", e.target.value)
                        }
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
                        value={fields.recurrenceTime}
                        onChange={(e) =>
                          onFieldChange("recurrenceTime", e.target.value)
                        }
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
}
