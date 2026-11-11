"use client";

import { useActionState } from "react";

import {
  createChurchAction,
  type ChurchFormState,
} from "@/app/actions/organization";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function OnboardingForm({
  needsBirthday = false,
}: {
  needsBirthday?: boolean;
}) {
  const [state, formAction] = useActionState<ChurchFormState, FormData>(
    createChurchAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="name">Nome da igreja</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="organization"
            placeholder="Ex.: Igreja Comunidade da Graça"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
            autoFocus
            required
          />
          <FieldDescription>
            Você será o proprietário e poderá convidar administradores depois.
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.name?.map((message) => ({
              message,
            }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.phone)}>
          <FieldLabel htmlFor="phone">WhatsApp / Celular</FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Ex.: (11) 99999-8888"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.phone)}
          />
          <FieldDescription>
            Usado para receber escalas dos cultos e avisos importantes via WhatsApp.
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.phone?.map((message) => ({
              message,
            }))}
          />
        </Field>

        {needsBirthday ? (
          <Field data-invalid={Boolean(state?.fieldErrors?.birthday)}>
            <FieldLabel htmlFor="birthday">Data de aniversário</FieldLabel>
            <Input
              id="birthday"
              name="birthday"
              type="date"
              autoComplete="bday"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.birthday)}
            />
            <FieldDescription>
              Opcional. Usamos para lembrar aniversários da equipe.
            </FieldDescription>
            <FieldError
              errors={state?.fieldErrors?.birthday?.map((message) => ({
                message,
              }))}
            />
          </Field>
        ) : null}
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Criando igreja..."
        size="lg"
      >
        Criar igreja e continuar
      </SubmitButton>
    </form>
  );
}
