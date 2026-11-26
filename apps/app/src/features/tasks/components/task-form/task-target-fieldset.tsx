"use client";

import { ChurchIcon, SearchIcon, UserIcon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { DelegationType } from "../../services/tasks-service";
import type {
  DepartmentOption,
  MemberOption,
  TargetType,
  TaskFieldErrors,
} from "./task-form.types";

type TaskTargetFieldsetProps = {
  isEditing: boolean;
  targetType: TargetType;
  departmentId: string;
  assigneeId: string;
  memberSearch: string;
  delegationType: DelegationType;
  departments: DepartmentOption[];
  members: MemberOption[];
  filteredMembers: MemberOption[];
  canChooseMember: boolean;
  canChooseDepartment: boolean;
  canChooseChurch: boolean;
  fieldErrors: TaskFieldErrors;
  onTargetTypeChange: (next: TargetType) => void;
  onDepartmentIdChange: (id: string) => void;
  onAssigneeIdChange: (id: string) => void;
  onMemberSearchChange: (q: string) => void;
  onDelegationTypeChange: (next: DelegationType) => void;
  onClearFieldErrors: (keys: Array<keyof TaskFieldErrors>) => void;
};

export function TaskTargetFieldset({
  isEditing,
  targetType,
  departmentId,
  assigneeId,
  memberSearch,
  delegationType,
  departments,
  members,
  filteredMembers,
  canChooseMember,
  canChooseDepartment,
  canChooseChurch,
  fieldErrors,
  onTargetTypeChange,
  onDepartmentIdChange,
  onAssigneeIdChange,
  onMemberSearchChange,
  onDelegationTypeChange,
  onClearFieldErrors,
}: TaskTargetFieldsetProps) {
  return (
    <fieldset className="space-y-2.5 rounded-xl border bg-muted/20 p-3">
      <legend className="px-1 text-xs font-semibold text-foreground">
        Para quem é esta tarefa?
      </legend>

      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
        <Button
          type="button"
          variant={targetType === "self" ? "default" : "outline"}
          size="sm"
          className="min-h-10 justify-start gap-1.5 sm:min-h-9"
          onClick={() => {
            onTargetTypeChange("self");
            onClearFieldErrors(["assigneeId", "departmentId"]);
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
            className="min-h-10 justify-start gap-1.5 sm:min-h-9"
            onClick={() => {
              onTargetTypeChange("member");
              onClearFieldErrors(["departmentId"]);
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
            className="min-h-10 justify-start gap-1.5 sm:min-h-9"
            onClick={() => {
              onTargetTypeChange("department");
              if (!departmentId && departments[0]?.id) {
                onDepartmentIdChange(departments[0].id);
              }
              onClearFieldErrors(["assigneeId"]);
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
            className="min-h-10 justify-start gap-1.5 sm:min-h-9"
            onClick={() => {
              onTargetTypeChange("church");
              onClearFieldErrors(["assigneeId", "departmentId"]);
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
                onChange={(e) => onMemberSearchChange(e.target.value)}
                placeholder="Buscar pessoa por nome..."
                aria-label="Filtrar pessoas por nome"
                className="min-h-10 pl-9"
              />
            </div>
          ) : null}
          <NativeSelect
            id="task-assignee"
            value={assigneeId}
            onChange={(e) => {
              onAssigneeIdChange(e.target.value);
              onClearFieldErrors(["assigneeId"]);
            }}
            aria-invalid={fieldErrors.assigneeId ? "true" : undefined}
            aria-describedby={
              fieldErrors.assigneeId ? "task-assignee-error" : undefined
            }
            className="min-h-11 w-full"
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
                onDepartmentIdChange(e.target.value);
                onClearFieldErrors(["departmentId"]);
              }}
              aria-invalid={fieldErrors.departmentId ? "true" : undefined}
              className="min-h-11 w-full"
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
                    "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors",
                    delegationType === "shared"
                      ? "border-primary bg-primary/5"
                      : "bg-background hover:bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    name="delegationType"
                    checked={delegationType === "shared"}
                    onChange={() => onDelegationTypeChange("shared")}
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
                    "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors",
                    delegationType === "individual"
                      ? "border-primary bg-primary/5"
                      : "bg-background hover:bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    name="delegationType"
                    checked={delegationType === "individual"}
                    onChange={() => onDelegationTypeChange("individual")}
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
  );
}
