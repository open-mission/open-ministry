"use client";

import { useState, useTransition } from "react";
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

import { invitePersonAction } from "@/app/actions/people";
import { FormAlert } from "@/components/auth/form-alert";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyToClipboard } from "@/lib/clipboard";
import { formatDate } from "@/lib/format";
import { buildWhatsAppShareUrl } from "@/lib/message-templates";

export type InvitePersonTarget = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  userId?: string | null;
};

export function InvitePersonDialog({
  person,
  disabled,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: {
  person: InvitePersonTarget;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || Boolean(person.userId)}
              aria-label={`Convidar ${person.name} para o aplicativo`}
            >
              <UserPlusIcon data-icon="inline-start" />
              Convidar
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            Convidar {person.name}
          </DialogTitle>
          <DialogDescription>
            Gere um link seguro e envie por email ou WhatsApp para a pessoa criar a conta.
          </DialogDescription>
        </DialogHeader>
        <InvitePersonContent person={person} />
      </DialogContent>
    </Dialog>
  );
}

function InvitePersonContent({ person }: { person: InvitePersonTarget }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    link: string;
    expiresAt: string;
    whatsappMessage?: string;
    saveContactMessage?: string;
    whatsappShareUrl?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedSave, setCopiedSave] = useState(false);

  function handleInvite() {
    setError(null);

    startTransition(async () => {
      const response = await invitePersonAction(person.id);

      if (response.ok && response.link) {
        setResult({
          link: response.link,
          expiresAt: response.expiresAt ?? new Date().toISOString(),
          whatsappMessage: response.whatsappMessage,
          saveContactMessage: response.saveContactMessage,
          whatsappShareUrl: response.whatsappShareUrl,
        });
        return;
      }

      if (response.error) {
        setError(response.error);
        toast.error(response.error);
      }
    });
  }

  if (result) {
    const inviteMsg = result.whatsappMessage || "";
    const saveContactMsg = result.saveContactMessage || "";
    const phone = person.phone;

    const inviteUrl =
      result.whatsappShareUrl ||
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
        <div className="rounded-xl border bg-accent/30 p-4 space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckIcon className="size-3.5" />
            </span>
            Convite criado com sucesso
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Envie o link para{" "}
            <span className="font-medium text-foreground">{person.email}</span>. A
            pessoa entra na igreja usando este mesmo email.
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={result.link}
              className="h-9 flex-1 bg-background text-xs font-mono"
              onFocus={(event) => event.currentTarget.select()}
            />
            <CopyTextButton value={result.link} size="icon-sm" />
          </div>
          <p className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <ClockIcon className="size-3.5" />
            Válido até {formatDate(result.expiresAt)}
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
                  <strong>Dica anti-bloqueio:</strong> Peça para o membro salvar o contato da igreja na agenda para não ser bloqueado como spam pelo WhatsApp.
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        O convite será gerado para{" "}
        <span className="font-medium text-foreground">{person.email}</span> e
        expira em 7 dias. Você poderá copiar a mensagem ou abrir direto no WhatsApp.
      </div>

      {error ? <FormAlert>{error}</FormAlert> : null}

      <Button
        type="button"
        className="h-10 w-full"
        size="lg"
        disabled={pending}
        onClick={handleInvite}
      >
        {pending ? (
          <>
            <UserPlusIcon data-icon="inline-start" />
            Gerando convite...
          </>
        ) : (
          <>
            <MailPlusIcon data-icon="inline-start" />
            Gerar convite & WhatsApp
          </>
        )}
      </Button>
    </div>
  );
}
