"use client";

import { useState, useTransition } from "react";
import { PencilIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import {
  updateProfileAction,
  type ProfileFormState,
} from "@/app/actions/profile";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { ImageUploadButton } from "@/components/uploads/image-upload-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatOwnBirthday } from "@/lib/birthdays";
import { getInitials } from "@/lib/format";

export function ProfileEditor({
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
  const [editing, setEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState(image);
  const [state, setState] = useState<ProfileFormState>(undefined);
  const [, startTransition] = useTransition();
  const birthdayLabel = formatOwnBirthday(birthday, true);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfileAction(undefined, formData);

      setState(result);

      if (result?.success) {
        toast.success("Perfil atualizado.");
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Seus dados aparecem para a igreja no diretório e nas escalas.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setImageUrl(image);
              setState(undefined);
              setEditing(true);
            }}
          >
            <PencilIcon data-icon="inline-start" />
            Editar perfil
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="profile-read-name">Nome</FieldLabel>
            <Input
              id="profile-read-name"
              value={name}
              readOnly
              className="h-10 bg-muted/50"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-read-email">Email</FieldLabel>
            <Input
              id="profile-read-email"
              value={email}
              readOnly
              className="h-10 bg-muted/50"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-read-birthday">
              Aniversário
            </FieldLabel>
            <Input
              id="profile-read-birthday"
              value={birthdayLabel ?? "Não informado"}
              readOnly
              className="h-10 bg-muted/50"
            />
          </Field>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-3">
        <Avatar className="size-14">
          <AvatarImage src={imageUrl ?? undefined} alt={name} />
          <AvatarFallback className="bg-primary/10 font-heading text-lg text-primary">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium">Foto do perfil</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP ou GIF com até 2 MB.
          </p>
        </div>
        <ImageUploadButton
          endpoint="profileImage"
          label="Enviar foto"
          onUploaded={setImageUrl}
        />
      </div>

      <input type="hidden" name="image" value={imageUrl ?? ""} />

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
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
              errors={state?.fieldErrors?.name?.map((message) => ({
                message,
              }))}
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
              O email é o mesmo da sua conta.
            </FieldDescription>
          </Field>

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
        </div>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton
          className="h-10"
          pendingLabel="Salvando..."
          size="lg"
        >
          <SaveIcon data-icon="inline-start" />
          Salvar perfil
        </SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="h-10"
          onClick={() => {
            setImageUrl(image);
            setState(undefined);
            setEditing(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
