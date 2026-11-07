"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { AtSignIcon, CheckIcon } from "lucide-react";

import {
  updateAccountSettingsAction,
  type AccountSettingsFormState,
} from "@/app/actions/settings";
import { ImageUploadButton } from "@/components/uploads/image-upload-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/format";

type AccountProfileCardProps = {
  initialData: {
    name: string;
    username: string | null;
    email: string;
    birthday: string | null;
    image: string | null;
  };
};

export function AccountProfileCard({ initialData }: AccountProfileCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialData.image);
  const [state, formAction, isPending] = useActionState<
    AccountSettingsFormState,
    FormData
  >(async (prevState, formData) => {
    const res = await updateAccountSettingsAction(prevState, formData);
    if (res?.success) {
      toast.success("Configurações da conta salvas com sucesso!");
    } else if (res?.error) {
      toast.error(res.error);
    }
    return res;
  }, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl tracking-tight">
          Informações da Conta
        </CardTitle>
        <CardDescription>
          Gerencie seu nome completo, identificador de usuário, foto de perfil e aniversário.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="image" value={imageUrl ?? ""} />

          {/* Avatar and photo change */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-20 ring-2 ring-border">
              <AvatarImage src={imageUrl ?? undefined} alt={initialData.name} />
              <AvatarFallback className="bg-primary/10 font-heading text-2xl text-primary">
                {getInitials(initialData.name)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <ImageUploadButton
                  endpoint="profileImage"
                  label="Alterar foto"
                  onUploaded={(url) => setImageUrl(url)}
                />
                {imageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageUrl(null)}
                  >
                    Remover foto
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendamos imagens quadradas PNG, JPG ou WebP de até 4MB.
              </p>
            </div>
          </div>

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(state?.fieldErrors?.name)} className="sm:col-span-2">
              <FieldLabel htmlFor="name">Nome completo</FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={initialData.name}
                required
                className="h-10"
                aria-invalid={Boolean(state?.fieldErrors?.name)}
              />
              <FieldError
                errors={state?.fieldErrors?.name?.map((m) => ({ message: m }))}
              />
            </Field>

            <Field data-invalid={Boolean(state?.fieldErrors?.username)}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="username">Nome de usuário</FieldLabel>
                <span className="text-xs text-muted-foreground">Opcional</span>
              </div>
              <div className="relative">
                <AtSignIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  defaultValue={initialData.username ?? ""}
                  placeholder="seu.usuario"
                  className="h-10 pl-9"
                  aria-invalid={Boolean(state?.fieldErrors?.username)}
                />
              </div>
              <FieldDescription>
                Permite que você entre usando este identificador além do email.
              </FieldDescription>
              <FieldError
                errors={state?.fieldErrors?.username?.map((m) => ({ message: m }))}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                defaultValue={initialData.email}
                disabled
                className="h-10 bg-muted/50 cursor-not-allowed"
              />
              <FieldDescription>
                O email da conta não pode ser alterado diretamente por aqui.
              </FieldDescription>
            </Field>

            <Field data-invalid={Boolean(state?.fieldErrors?.birthday)} className="sm:col-span-2">
              <FieldLabel htmlFor="birthday">Data de nascimento</FieldLabel>
              <Input
                id="birthday"
                name="birthday"
                type="date"
                defaultValue={initialData.birthday ?? ""}
                className="h-10 max-w-xs"
                aria-invalid={Boolean(state?.fieldErrors?.birthday)}
              />
              <FieldDescription>
                Visível para felicitações e lembretes da liderança.
              </FieldDescription>
              <FieldError
                errors={state?.fieldErrors?.birthday?.map((m) => ({ message: m }))}
              />
            </Field>
          </FieldGroup>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                "Salvando..."
              ) : (
                <>
                  <CheckIcon className="size-4" />
                  Salvar alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
