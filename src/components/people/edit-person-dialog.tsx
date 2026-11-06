"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";

import {
  updatePersonAction,
  type PersonFormState,
} from "@/app/actions/people";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Person = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  userId: string | null;
  user?: {
    name: string;
    email: string;
    birthday: string | null;
  } | null;
};

export function EditPersonDialog({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  const displayName = person.user?.name ?? person.name;
  const displayEmail = person.user?.email ?? person.email;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar ${displayName}`}
          title="Editar pessoa"
        >
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            {displayName}
          </DialogTitle>
          <DialogDescription>
            {person.userId
              ? "Nome e email vêm da conta vinculada. Você pode ajustar o aniversário e o telefone."
              : "Atualize os dados de contato e o aniversário desta pessoa."}
          </DialogDescription>
        </DialogHeader>
        <EditPersonForm
          person={person}
          displayName={displayName}
          displayEmail={displayEmail ?? ""}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditPersonForm({
  person,
  displayName,
  displayEmail,
  onDone,
}: {
  person: Person;
  displayName: string;
  displayEmail: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<PersonFormState, FormData>(
    updatePersonAction,
    undefined,
  );
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Pessoa atualizada.");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="personId" value={person.id} />

      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="edit-person-name">Nome</FieldLabel>
          <Input
            id="edit-person-name"
            name="name"
            defaultValue={displayName}
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
            readOnly={Boolean(person.userId)}
            required
          />
          <FieldError
            errors={state?.fieldErrors?.name?.map((message) => ({ message }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.email)}>
          <FieldLabel htmlFor="edit-person-email">Email</FieldLabel>
          <Input
            id="edit-person-email"
            name="email"
            type="email"
            defaultValue={displayEmail}
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.email)}
            readOnly={Boolean(person.userId)}
          />
          <FieldDescription>
            {person.userId
              ? "O email é o mesmo da conta que está vinculada a esta pessoa."
              : "Use o email para enviar o convite de cadastro."}
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.email?.map((message) => ({ message }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(state?.fieldErrors?.birthday)}>
            <FieldLabel htmlFor="edit-person-birthday">Aniversário</FieldLabel>
            <Input
              id="edit-person-birthday"
              name="birthday"
              type="date"
              defaultValue={
                person.birthday ?? person.user?.birthday ?? ""
              }
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.birthday)}
            />
            <FieldError
              errors={state?.fieldErrors?.birthday?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.phone)}>
            <FieldLabel htmlFor="edit-person-phone">Telefone</FieldLabel>
            <Input
              id="edit-person-phone"
              name="phone"
              type="tel"
              defaultValue={person.phone ?? ""}
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.phone)}
            />
            <FieldError
              errors={state?.fieldErrors?.phone?.map((message) => ({
                message,
              }))}
            />
          </Field>
        </div>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Salvando..."
        size="lg"
      >
        Salvar pessoa
      </SubmitButton>
    </form>
  );
}
