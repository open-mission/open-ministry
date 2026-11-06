"use client";

import { useActionState, useEffect } from "react";
import { SaveIcon } from "lucide-react";
import { toast } from "sonner";

import {
  updateProfileAction,
  type ProfileFormState,
} from "@/app/actions/profile";
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

export function ProfileForm({
  name,
  email,
  birthday,
  image,
}: {
  name: string;
  email: string;
  birthday: string | null;
  image: string | null;
}) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Perfil atualizado.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="profile-name">Nome</FieldLabel>
          <Input
            id="profile-name"
            name="name"
            defaultValue={name}
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
            autoFocus
            required
          />
          <FieldError
            errors={state?.fieldErrors?.name?.map((message) => ({ message }))}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-email">Email</FieldLabel>
          <Input
            id="profile-email"
            defaultValue={email}
            className="h-10 bg-muted/50"
            readOnly
          />
          <FieldDescription>
            O email é o mesmo da sua conta e não pode ser alterado aqui.
          </FieldDescription>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(state?.fieldErrors?.birthday)}>
            <FieldLabel htmlFor="profile-birthday">Aniversário</FieldLabel>
            <Input
              id="profile-birthday"
              name="birthday"
              type="date"
              defaultValue={birthday ?? ""}
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.birthday)}
            />
            <FieldError
              errors={state?.fieldErrors?.birthday?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.image)}>
            <FieldLabel htmlFor="profile-image">Avatar</FieldLabel>
            <Input
              id="profile-image"
              name="image"
              type="url"
              defaultValue={image ?? ""}
              placeholder="https://..."
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.image)}
            />
            <FieldDescription>
              URL pública da sua foto. Em branco mantém a atual.
            </FieldDescription>
            <FieldError
              errors={state?.fieldErrors?.image?.map((message) => ({
                message,
              }))}
            />
          </Field>
        </div>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full sm:w-auto"
        pendingLabel="Salvando..."
        size="lg"
      >
        <SaveIcon data-icon="inline-start" />
        Salvar perfil
      </SubmitButton>
    </form>
  );
}
