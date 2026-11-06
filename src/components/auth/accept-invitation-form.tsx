"use client";

import { useActionState } from "react";
import { CheckIcon } from "lucide-react";

import {
  acceptInvitationAction,
  type AcceptInvitationState,
} from "@/app/actions/invitations";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";

type AcceptInvitationFormProps = {
  invitationId: string;
};

export function AcceptInvitationForm({
  invitationId,
}: AcceptInvitationFormProps) {
  const [state, formAction] = useActionState<
    AcceptInvitationState,
    FormData
  >(acceptInvitationAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="invitationId" value={invitationId} />

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
