"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import {
  saveScheduleAssignmentAction,
  type ScheduleFormState,
} from "@/app/actions/events";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type DepartmentFunction = {
  id: string;
  name: string;
};

type DepartmentMember = {
  id: string;
  name: string;
  email: string | null;
};

type Assignment = {
  functionId: string;
  personId: string;
};

export function AddAssignmentDialog({
  eventId,
  departmentId,
  departmentName,
  functions,
  members,
  assignments,
}: {
  eventId: string;
  departmentId: string;
  departmentName: string;
  functions: DepartmentFunction[];
  members: DepartmentMember[];
  assignments: Assignment[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={functions.length === 0 || members.length === 0}
        >
          <UserPlusIcon data-icon="inline-start" />
          Escalar pessoa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Escalar em {departmentName}
          </DialogTitle>
          <DialogDescription>
            Escolha a função e quem vai atuar nesta ocorrência. A escala é
            salva na hora.
          </DialogDescription>
        </DialogHeader>
        <AssignmentForm
          eventId={eventId}
          departmentId={departmentId}
          functions={functions}
          members={members}
          assignments={assignments}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssignmentForm({
  eventId,
  departmentId,
  functions,
  members,
  assignments,
}: {
  eventId: string;
  departmentId: string;
  functions: DepartmentFunction[];
  members: DepartmentMember[];
  assignments: Assignment[];
}) {
  const [state, formAction] = useActionState<ScheduleFormState, FormData>(
    saveScheduleAssignmentAction,
    undefined,
  );
  const [functionId, setFunctionId] = useState(functions[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      toast.success("Pessoa escalada.");
    }
  }, [state]);

  const assignedPersonIds = new Set(
    assignments
      .filter((assignment) => assignment.functionId === functionId)
      .map((assignment) => assignment.personId),
  );
  const availableMembers = members
    .filter((member) => !assignedPersonIds.has(member.id))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const selectedFunction = functions.find(
    (departmentFunction) => departmentFunction.id === functionId,
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="departmentId" value={departmentId} />

      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.functionId)}>
          <FieldLabel htmlFor="assignment-function">Função</FieldLabel>
          <NativeSelect
            id="assignment-function"
            name="functionId"
            value={functionId}
            onChange={(event) => setFunctionId(event.target.value)}
            className="w-full [&_select]:h-10"
            aria-invalid={Boolean(state?.fieldErrors?.functionId)}
            required
          >
            {functions.map((departmentFunction) => (
              <NativeSelectOption
                key={departmentFunction.id}
                value={departmentFunction.id}
              >
                {departmentFunction.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError
            errors={state?.fieldErrors?.functionId?.map((message) => ({
              message,
            }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.personId)}>
          <FieldLabel htmlFor="assignment-person">Pessoa</FieldLabel>
          <NativeSelect
            id="assignment-person"
            name="personId"
            defaultValue=""
            className="w-full [&_select]:h-10"
            aria-invalid={Boolean(state?.fieldErrors?.personId)}
            disabled={availableMembers.length === 0}
            required
          >
            <NativeSelectOption value="" disabled>
              Escolha uma pessoa
            </NativeSelectOption>
            {availableMembers.map((member) => (
              <NativeSelectOption key={member.id} value={member.id}>
                {member.name}
                {member.email ? ` — ${member.email}` : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError
            errors={state?.fieldErrors?.personId?.map((message) => ({
              message,
            }))}
          />
        </Field>
      </FieldGroup>

      {availableMembers.length === 0 ? (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {members.length === 0
            ? "Este departamento ainda não tem pessoas. Adicione alguém ao departamento primeiro."
            : `Todas as pessoas do departamento já estão escaladas em ${selectedFunction?.name ?? "esta função"}.`}
        </p>
      ) : null}

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Escalando..."
        size="lg"
        disabled={availableMembers.length === 0}
      >
        <UserPlusIcon data-icon="inline-start" />
        Escalar nesta função
      </SubmitButton>
    </form>
  );
}
