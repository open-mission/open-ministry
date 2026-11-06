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

export function OnboardingForm() {
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
