"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MegaphoneIcon } from "lucide-react";
import { toast } from "sonner";

import {
  sendAnnouncementAction,
  type AnnouncementFormState,
} from "@/app/actions/notifications";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Department = {
  id: string;
  name: string;
};

export function AnnouncementDialog({
  departments,
}: {
  departments: Department[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-9">
          <MegaphoneIcon data-icon="inline-start" />
          Enviar aviso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Enviar aviso
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem para a igreja ou para um departamento. As
            pessoas recebem no sino e na central de notificações.
          </DialogDescription>
        </DialogHeader>
        <AnnouncementForm
          departments={departments}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementForm({
  departments,
  onDone,
}: {
  departments: Department[];
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<
    AnnouncementFormState,
    FormData
  >(sendAnnouncementAction, undefined);
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Aviso enviado.");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.title)}>
          <FieldLabel htmlFor="announcement-title">Título</FieldLabel>
          <Input
            id="announcement-title"
            name="title"
            placeholder="Ensaio geral deste sábado"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.title)}
            autoFocus
            required
          />
          <FieldError
            errors={state?.fieldErrors?.title?.map((message) => ({
              message,
            }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.body)}>
          <FieldLabel htmlFor="announcement-body">Mensagem</FieldLabel>
          <Textarea
            id="announcement-body"
            name="body"
            placeholder="O que a equipe precisa saber?"
            rows={4}
            aria-invalid={Boolean(state?.fieldErrors?.body)}
            required
          />
          <FieldError
            errors={state?.fieldErrors?.body?.map((message) => ({
              message,
            }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.audience)}>
          <FieldLabel htmlFor="announcement-audience">Quem recebe</FieldLabel>
          <NativeSelect
            id="announcement-audience"
            name="audience"
            defaultValue="all"
            className="w-full [&_select]:h-10"
            aria-invalid={Boolean(state?.fieldErrors?.audience)}
          >
            <NativeSelectOption value="all">
              Toda a igreja
            </NativeSelectOption>
            {departments.map((department) => (
              <NativeSelectOption
                key={department.id}
                value={department.id}
              >
                {department.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>
            Pessoas sem conta não recebem notificações no app.
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.audience?.map((message) => ({
              message,
            }))}
          />
        </Field>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Enviando..."
        size="lg"
      >
        <MegaphoneIcon data-icon="inline-start" />
        Enviar aviso
      </SubmitButton>
    </form>
  );
}
