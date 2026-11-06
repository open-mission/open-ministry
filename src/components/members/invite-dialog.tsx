"use client";

import { useActionState, useState } from "react";
import {
  CheckIcon,
  ClockIcon,
  MailPlusIcon,
  UserPlusIcon,
} from "lucide-react";

import {
  inviteMemberAction,
  type InviteFormState,
} from "@/app/actions/invitations";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { CopyTextButton } from "@/components/members/copy-text-button";
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
import { formatDate } from "@/lib/format";

export function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-9">
          <UserPlusIcon data-icon="inline-start" />
          Convidar pessoa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Convidar pessoa
          </DialogTitle>
          <DialogDescription>
            Gere um link seguro e envie para o email da pessoa. Ela entra na
            igreja usando este mesmo email.
          </DialogDescription>
        </DialogHeader>
        <InviteForm
          key={formKey}
          onReset={() => setFormKey((current) => current + 1)}
        />
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({ onReset }: { onReset: () => void }) {
  const [state, formAction] = useActionState<InviteFormState, FormData>(
    inviteMemberAction,
    undefined,
  );

  if (state?.invitation) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-accent/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckIcon className="size-3.5" />
            </span>
            Convite criado
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Envie o link abaixo para{" "}
            <span className="font-medium text-foreground">
              {state.invitation.email}
            </span>
            . A pessoa precisa entrar com este mesmo email.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Input
              readOnly
              value={state.invitation.link}
              className="h-9 flex-1 bg-background text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <CopyTextButton value={state.invitation.link} size="icon-sm" />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <ClockIcon className="size-3.5" />
            Válido até {formatDate(state.invitation.expiresAt)}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onReset}
        >
          <MailPlusIcon data-icon="inline-start" />
          Convidar outra pessoa
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.email)}>
          <FieldLabel htmlFor="invite-email">Email da pessoa</FieldLabel>
          <Input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="pessoa@igreja.com"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.email)}
            autoFocus
            required
          />
          <FieldError
            errors={state?.fieldErrors?.email?.map((message) => ({
              message,
            }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.role)}>
          <FieldLabel htmlFor="invite-role">Papel na igreja</FieldLabel>
          <NativeSelect
            id="invite-role"
            name="role"
            defaultValue="member"
            className="w-full [&_select]:h-10"
          >
            <NativeSelectOption value="member">
              Membro — acesso de leitura
            </NativeSelectOption>
            <NativeSelectOption value="admin">
              Administrador — gerencia pessoas e convites
            </NativeSelectOption>
          </NativeSelect>
          <FieldDescription>
            Você pode alterar o papel da pessoa depois.
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.role?.map((message) => ({
              message,
            }))}
          />
        </Field>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Gerando convite..."
        size="lg"
      >
        <MailPlusIcon data-icon="inline-start" />
        Gerar link de convite
      </SubmitButton>
    </form>
  );
}
