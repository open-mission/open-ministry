"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  createPersonAction,
  invitePersonAction,
  type PersonActionResult,
  type PersonFormState,
} from "@/app/actions/people";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { InviteForm } from "@/features/people/components/invite-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyToClipboard } from "@/lib/clipboard";

export function CreatePersonDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
} = {}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"create" | "invite">("create");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="lg" className="h-9 gap-1.5">
            <UserPlusIcon className="size-4" />
            Adicionar pessoa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Adicionar pessoa
          </DialogTitle>
          <DialogDescription>
            Cadastre voluntários na igreja ou envie um convite de acesso ao
            aplicativo.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(val) => setTab(val as "create" | "invite")}
          className="w-full space-y-4"
        >
          <TabsList className="grid grid-cols-2 w-full h-10">
            <TabsTrigger value="create" className="text-xs sm:text-sm gap-1.5">
              <UserPlusIcon className="size-3.5" />
              Cadastrar pessoa
            </TabsTrigger>
            <TabsTrigger value="invite" className="text-xs sm:text-sm gap-1.5">
              <LinkIcon className="size-3.5" />
              Convidar para app
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-0">
            <CreatePersonForm onDone={() => setOpen(false)} />
          </TabsContent>

          <TabsContent value="invite" className="mt-0">
            <InviteForm onReset={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CreatePersonForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useActionState<PersonFormState, FormData>(
    createPersonAction,
    undefined,
  );
  const handled = useRef(false);
  const [sendInvite, setSendInvite] = useState(true);
  const [emailValue, setEmailValue] = useState("");
  const [inviteResult, setInviteResult] = useState<PersonActionResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state?.success && state.personId && !handled.current) {
      handled.current = true;
      if (sendInvite && emailValue.trim()) {
        const pId = state.personId;
        startTransition(async () => {
          const res = await invitePersonAction(pId);
          if (res.ok) {
            setInviteResult(res);
            toast.success("Pessoa cadastrada e convite gerado!");
          } else {
            toast.success("Pessoa cadastrada.");
            onDone();
          }
        });
      } else {
        toast.success("Pessoa cadastrada.");
        onDone();
      }
    }
  }, [state, sendInvite, emailValue, onDone]);

  async function handleCopyLink() {
    if (!inviteResult?.link) return;
    try {
      await copyToClipboard(inviteResult.link);
      setCopiedLink(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  }

  if (inviteResult) {
    return (
      <div className="space-y-4 py-2">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-200">
          <p className="font-semibold text-sm">Pessoa cadastrada com sucesso!</p>
          <p className="text-xs text-muted-foreground mt-1">
            O convite de acesso foi gerado. Compartilhe o link ou envie
            diretamente pelo WhatsApp:
          </p>
        </div>

        {inviteResult.whatsappMessage && (
          <div className="rounded-xl border bg-muted/40 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
            {inviteResult.whatsappMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 text-xs"
          >
            {copiedLink ? (
              <CheckIcon className="size-3.5 text-primary" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            Copiar link
          </Button>

          {inviteResult.whatsappShareUrl ? (
            <Button
              type="button"
              size="sm"
              asChild
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <a
                href={inviteResult.whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="size-3.5" />
                Enviar no WhatsApp
              </a>
            </Button>
          ) : null}
        </div>

        <Button
          type="button"
          className="w-full mt-4"
          variant="outline"
          onClick={onDone}
        >
          Concluir
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup>
        <Field data-invalid={Boolean(state?.fieldErrors?.name)}>
          <FieldLabel htmlFor="person-name">Nome</FieldLabel>
          <Input
            id="person-name"
            name="name"
            placeholder="Como a pessoa é chamada"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.name)}
            autoFocus
            required
          />
          <FieldError
            errors={state?.fieldErrors?.name?.map((message) => ({ message }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.email)}>
          <FieldLabel htmlFor="person-email">
            Email{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </FieldLabel>
          <Input
            id="person-email"
            name="email"
            type="email"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder="pessoa@igreja.com"
            className="h-10"
            aria-invalid={Boolean(state?.fieldErrors?.email)}
          />
          <FieldDescription>
            Necessário caso deseje enviar o convite de acesso ao aplicativo.
          </FieldDescription>
          <FieldError
            errors={state?.fieldErrors?.email?.map((message) => ({ message }))}
          />
        </Field>

        {emailValue.trim().length > 0 && (
          <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-border/70 p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                Gerar convite de acesso agora
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Gera o link de login e mensagem pré-formatada para envio via WhatsApp ou email.
              </p>
            </div>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(state?.fieldErrors?.birthday)}>
            <FieldLabel htmlFor="person-birthday">
              Aniversário{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </FieldLabel>
            <Input
              id="person-birthday"
              name="birthday"
              type="date"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.birthday)}
            />
            <FieldError
              errors={state?.fieldErrors?.birthday?.map((message) => ({
                message,
              }))}
            />
          </Field>

          <Field data-invalid={Boolean(state?.fieldErrors?.phone)}>
            <FieldLabel htmlFor="person-phone">
              Telefone{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </FieldLabel>
            <Input
              id="person-phone"
              name="phone"
              type="tel"
              placeholder="(11) 99999-0000"
              className="h-10"
              aria-invalid={Boolean(state?.fieldErrors?.phone)}
            />
            <FieldError
              errors={state?.fieldErrors?.phone?.map((message) => ({
                message,
              }))}
            />
          </Field>
        </div>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <SubmitButton
        className="h-10 w-full"
        pendingLabel="Cadastrando..."
        size="lg"
      >
        <UserPlusIcon data-icon="inline-start" />
        {sendInvite && emailValue.trim()
          ? "Cadastrar e gerar convite"
          : "Cadastrar pessoa"}
      </SubmitButton>
    </form>
  );
}
