"use client";

import { useActionState, useState, type ComponentProps } from "react";
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  MailPlusIcon,
  MessageSquareIcon,
  ShieldAlertIcon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyToClipboard } from "@/lib/clipboard";
import { formatDate } from "@/lib/format";
import { buildWhatsAppShareUrl } from "@/lib/message-templates";

export function InviteDialog({
  variant = "default",
}: {
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-9" variant={variant}>
          <UserPlusIcon data-icon="inline-start" />
          Convidar pessoa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Convidar pessoa
          </DialogTitle>
          <DialogDescription>
            Gere um link seguro e envie por email ou WhatsApp para a pessoa criar a conta.
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

  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedSave, setCopiedSave] = useState(false);

  if (state?.invitation) {
    const inviteMsg = state.invitation.whatsappMessage || "";
    const saveContactMsg = state.invitation.saveContactMessage || "";
    const phone = state.invitation.phone;

    const inviteUrl =
      state.invitation.whatsappShareUrl ||
      buildWhatsAppShareUrl({ phone, text: inviteMsg });

    const saveUrl = buildWhatsAppShareUrl({ phone, text: saveContactMsg });

    const handleCopyInvite = async () => {
      try {
        await copyToClipboard(inviteMsg);
        setCopiedInvite(true);
        toast.success("Mensagem do convite copiada!");
        setTimeout(() => setCopiedInvite(false), 2000);
      } catch {
        toast.error("Erro ao copiar mensagem.");
      }
    };

    const handleCopySave = async () => {
      try {
        await copyToClipboard(saveContactMsg);
        setCopiedSave(true);
        toast.success("Mensagem para salvar contato copiada!");
        setTimeout(() => setCopiedSave(false), 2000);
      } catch {
        toast.error("Erro ao copiar mensagem.");
      }
    };

    return (
      <div className="space-y-4">
        {/* Link summary */}
        <div className="rounded-xl border bg-accent/30 p-4 space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckIcon className="size-3.5" />
            </span>
            Convite criado com sucesso
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Convite para{" "}
            <strong className="text-foreground">
              {state.invitation.name || state.invitation.email}
            </strong>
            . Envie o link ou a mensagem pronta pelo WhatsApp:
          </p>

          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={state.invitation.link}
              className="h-9 flex-1 bg-background text-xs font-mono"
              onFocus={(event) => event.currentTarget.select()}
            />
            <CopyTextButton value={state.invitation.link} size="icon-sm" />
          </div>

          <p className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <ClockIcon className="size-3.5" />
            Válido até {formatDate(state.invitation.expiresAt)}
          </p>
        </div>

        {/* WhatsApp Ready Messages */}
        <div className="space-y-3">
          <Tabs defaultValue="invite" className="space-y-2.5">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="invite" className="text-xs gap-1.5">
                <MessageSquareIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Mensagem WhatsApp
              </TabsTrigger>
              <TabsTrigger value="save" className="text-xs gap-1.5">
                <ShieldAlertIcon className="size-3.5 text-amber-500" />
                Salvar Contato
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invite" className="space-y-2.5 mt-0">
              <div className="rounded-xl border bg-muted/40 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto">
                {inviteMsg}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyInvite}
                  className="gap-1.5 text-xs"
                >
                  {copiedInvite ? (
                    <CheckIcon className="size-3.5 text-primary" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  Copiar Mensagem
                </Button>

                <Button
                  type="button"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon className="size-3.5" />
                    Abrir no WhatsApp
                  </a>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="save" className="space-y-2.5 mt-0">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
                <ShieldAlertIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Dica anti-bloqueio:</strong> Peça para o membro salvar o contato da igreja. Isso evita que mensagens futuras caiam em spam.
                </p>
              </div>

              <div className="rounded-xl border bg-muted/40 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto">
                {saveContactMsg}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopySave}
                  className="gap-1.5 text-xs"
                >
                  {copiedSave ? (
                    <CheckIcon className="size-3.5 text-primary" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  Copiar Mensagem
                </Button>

                <Button
                  type="button"
                  size="sm"
                  asChild
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <a
                    href={saveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon className="size-3.5" />
                    Abrir no WhatsApp
                  </a>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
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
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="invite-name">
            Nome{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </FieldLabel>
          <Input
            id="invite-name"
            name="name"
            placeholder="Como a pessoa é chamada"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
          />
          <FieldDescription>
            Com o nome, a pessoa já aparece na igreja antes de criar a conta.
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.name?.map((message) => ({
              message,
            }))}
          />
        </Field>

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

        <Field data-invalid={Boolean(state?.fieldErrors?.phone)}>
          <FieldLabel htmlFor="invite-phone">
            WhatsApp{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </FieldLabel>
          <Input
            id="invite-phone"
            name="phone"
            type="tel"
            placeholder="Ex: 11988887777 (com DDD)"
            className="h-10"
          />
          <FieldDescription>
            Facilita o envio direto do convite e o recebimento de escalas.
          </FieldDescription>
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
              Membro — acesso de leitura e confirmação de escalas
            </NativeSelectOption>
            <NativeSelectOption value="admin">
              Administrador — gerencia pessoas, departamentos e escalas
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
        Gerar convite & WhatsApp
      </SubmitButton>
    </form>
  );
}
