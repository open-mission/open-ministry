"use client";

import { useActionState, useState } from "react";
import { PlusIcon } from "lucide-react";

import {
  createDepartmentAction,
  type DepartmentFormState,
} from "@/app/actions/departments";
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
import { Textarea } from "@/components/ui/textarea";

export function CreateDepartmentDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<DepartmentFormState, FormData>(
    createDepartmentAction,
    undefined,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-9">
          <PlusIcon data-icon="inline-start" />
          Novo departamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Novo departamento
          </DialogTitle>
          <DialogDescription>
            Crie o ministério e, depois, adicione as funções e as pessoas que
            servem nele.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <FieldGroup>
            <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
              <FieldLabel htmlFor="department-name">Nome</FieldLabel>
              <Input
                id="department-name"
                name="name"
                placeholder="Mídia, Louvor, Infantil..."
                className="h-10"
                aria-invalid={Boolean(state?.fieldErrors?.name)}
                autoFocus
                required
              />
              <FieldError
                errors={state?.fieldErrors?.name?.map((message) => ({
                  message,
                }))}
              />
            </Field>

            <Field data-invalid={Boolean(state?.fieldErrors?.description)}>
              <FieldLabel htmlFor="department-description">
                Descrição{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </FieldLabel>
              <Textarea
                id="department-description"
                name="description"
                placeholder="O que este departamento cuida e quando se reúne."
                rows={3}
                aria-invalid={Boolean(state?.fieldErrors?.description)}
              />
              <FieldDescription>
                Uma frase já ajuda quem está chegando a entender o ministério.
              </FieldDescription>
              <FieldError
                errors={state?.fieldErrors?.description?.map((message) => ({
                  message,
                }))}
              />
            </Field>
          </FieldGroup>

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

          <SubmitButton
            className="h-10 w-full"
            pendingLabel="Criando departamento..."
            size="lg"
          >
            <PlusIcon data-icon="inline-start" />
            Criar departamento
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
