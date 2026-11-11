"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import {
  addDepartmentMemberAction,
  type AddMemberFormState,
} from "@/app/actions/departments";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type AvailableMember = {
  id: string;
  name: string;
  email: string | null;
  hasAccount: boolean;
};

export function AddDepartmentMemberDialog({
  departmentId,
  availableMembers,
  canManageLeaders,
}: {
  departmentId: string;
  availableMembers: AvailableMember[];
  canManageLeaders: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={availableMembers.length === 0}
        >
          <UserPlusIcon data-icon="inline-start" />
          Adicionar pessoa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Adicionar pessoa
          </DialogTitle>
          <DialogDescription>
            Escolha alguém da igreja. Depois você define as funções e o nível de
            experiência de cada uma.
          </DialogDescription>
        </DialogHeader>
        <AddMemberForm
          departmentId={departmentId}
          availableMembers={availableMembers}
          canManageLeaders={canManageLeaders}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddMemberForm({
  departmentId,
  availableMembers,
  canManageLeaders,
  onDone,
}: {
  departmentId: string;
  availableMembers: AvailableMember[];
  canManageLeaders: boolean;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<AddMemberFormState, FormData>(
    addDepartmentMemberAction,
    undefined,
  );
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Pessoa adicionada ao departamento.");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="departmentId" value={departmentId} />

      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.personId)}>
          <FieldLabel htmlFor="department-member-person">Pessoa</FieldLabel>
          <NativeSelect
            id="department-member-person"
            name="personId"
            defaultValue=""
            className="w-full [&_select]:h-10"
            aria-invalid={Boolean(state?.fieldErrors?.personId)}
            required
          >
            <NativeSelectOption value="" disabled>
              Escolha uma pessoa
            </NativeSelectOption>
            {availableMembers.map((member) => (
              <NativeSelectOption key={member.id} value={member.id}>
                {member.name}
                {member.email ? ` — ${member.email}` : ""}
                {member.hasAccount ? "" : " (sem conta)"}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError
            errors={state?.fieldErrors?.personId?.map((message) => ({
              message,
            }))}
          />
        </Field>

        {canManageLeaders ? (
          <Field orientation="horizontal">
            <Checkbox id="department-member-leader" name="isLeader" />
            <FieldLabel htmlFor="department-member-leader">
              Definir como líder do departamento
            </FieldLabel>
          </Field>
        ) : null}
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Adicionando..."
        size="lg"
      >
        <UserPlusIcon data-icon="inline-start" />
        Adicionar ao departamento
      </SubmitButton>
    </form>
  );
}
