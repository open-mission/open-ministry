"use client";

import { useActionState } from "react";
import { CheckIcon } from "lucide-react";

import {
  acceptInvitationAction,
  type AcceptInvitationState,
} from "@/app/actions/invitations";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AcceptInvitationFormProps = {
  invitationId: string;
  needsBirthday?: boolean;
};

export function AcceptInvitationForm({
  invitationId,
  needsBirthday = false,
}: AcceptInvitationFormProps) {
  const [state, formAction] = useActionState<
    AcceptInvitationState,
    FormData
  >(acceptInvitationAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="invitationId" value={invitationId} />

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

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Aceitando convite..."
        size="lg"
      >
        <CheckIcon data-icon="inline-start" />
        Aceitar convite e entrar
      </SubmitButton>
    </form>
  );
}
