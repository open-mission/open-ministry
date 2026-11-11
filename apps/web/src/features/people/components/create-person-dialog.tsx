"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import {
  createPersonAction,
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

export function CreatePersonDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
} = {}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="lg" className="h-9">
            <UserPlusIcon data-icon="inline-start" />
            Nova pessoa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Nova pessoa
          </DialogTitle>
          <DialogDescription>
            Cadastre alguém antes de criar a conta. A pessoa já pode entrar em
            departamentos, escalas e aniversariantes.
          </DialogDescription>
        </DialogHeader>
        <CreatePersonForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreatePersonForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useActionState<PersonFormState, FormData>(
    createPersonAction,
    undefined,
  );
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Pessoa cadastrada.");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="person-name">Nome</FieldLabel>
          <Input
            id="person-name"
            name="name"
            placeholder="Como a pessoa é chamada"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
            autoFocus
            required
          />
          <FieldError
            errors={state?.fieldErrors?.name?.map((message) => ({ message }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.email)}>
          <FieldLabel htmlFor="person-email">
            Email{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </FieldLabel>
          <Input
            id="person-email"
            name="email"
            type="email"
            placeholder="pessoa@igreja.com"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.email)}
          />
          <FieldDescription>
            Se já existir uma conta com este email na igreja, o vínculo é feito
            automaticamente.
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.email?.map((message) => ({ message }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(state?.fieldErrors?.birthday)}>
            <FieldLabel htmlFor="person-birthday">
              Aniversário{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </FieldLabel>
            <Input
              id="person-birthday"
              name="birthday"
              type="date"
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
            <FieldLabel htmlFor="person-phone">
              Telefone{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </FieldLabel>
            <Input
              id="person-phone"
              name="phone"
              type="tel"
              placeholder="(11) 99999-0000"
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
        pendingLabel="Criando pessoa..."
        size="lg"
      >
        <UserPlusIcon data-icon="inline-start" />
        Criar pessoa
      </SubmitButton>
    </form>
  );
}
