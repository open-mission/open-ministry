"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  ChurchIcon,
  PencilIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  updateChurchBrandingAction,
  type ChurchBrandingFormState,
} from "@/app/actions/church";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export function ChurchBrandingForm({
  name,
  logo,
}: {
  name: string;
  logo: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(logo);
  const [state, setState] = useState<ChurchBrandingFormState>(undefined);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateChurchBrandingAction(
        undefined,
        formData,
      );

      setState(result);

      if (result?.success) {
        setIsEditingName(false);
        toast.success("Identidade da igreja atualizada.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 sm:contents">
          {logoUrl ? (
            <Avatar className="size-14 shrink-0 rounded-xl sm:size-16">
              <AvatarImage src={logoUrl} alt={`Logo de ${name}`} />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                <ChurchIcon className="size-7" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-16">
              <ChurchIcon className="size-7" />
            </span>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium">Logo da igreja</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Aparece no topo do painel. Use uma imagem quadrada de até 2 MB.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
          <ImageUploadButton
            endpoint="churchLogo"
            label={logoUrl ? "Trocar logo" : "Enviar logo"}
            onUploaded={setLogoUrl}
          />
          {logoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setLogoUrl(null)}
            >
              <Trash2Icon data-icon="inline-start" />
              Remover
            </Button>
          ) : null}
        </div>
      </div>

      <input type="hidden" name="logo" value={logoUrl ?? ""} />

      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="church-name">Nome da igreja</FieldLabel>
          <InputGroup
            className={cn(
              "h-10",
              !isEditingName && "bg-muted/30 dark:bg-muted/20",
            )}
          >
            <InputGroupInput
              ref={nameInputRef}
              id="church-name"
              name="name"
              defaultValue={name}
              readOnly={!isEditingName}
              aria-invalid={Boolean(state?.fieldErrors?.name)}
              className="h-10 read-only:cursor-default read-only:text-muted-foreground"
              required
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                aria-label={
                  isEditingName
                    ? "Concluir edição do nome da igreja"
                    : "Editar nome da igreja"
                }
                title={
                  isEditingName ? "Concluir edição" : "Editar nome da igreja"
                }
                onClick={() => setIsEditingName((editing) => !editing)}
              >
                {isEditingName ? <CheckIcon /> : <PencilIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            Esse nome aparece no painel, nos convites e no perfil dos membros.
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
        className="h-10 w-full sm:w-auto"
        pendingLabel="Salvando..."
        size="lg"
      >
        <SaveIcon data-icon="inline-start" />
        Salvar identidade
      </SubmitButton>
    </form>
  );
}
