"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  UserCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { getInvitationWhatsAppMessagesAction } from "@/app/actions/invitations";
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
import { buildWhatsAppShareUrl } from "@/lib/message-templates";

export function WhatsAppInvitationDialog({
  invitationId,
  email,
  name,
}: {
  invitationId: string;
  email: string;
  name?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [saveContactMessage, setSaveContactMessage] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedSave, setCopiedSave] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !inviteMessage) {
      startTransition(async () => {
        const res = await getInvitationWhatsAppMessagesAction(invitationId);
        if (res.ok && res.inviteMessage && res.saveContactMessage) {
          setInviteMessage(res.inviteMessage);
          setSaveContactMessage(res.saveContactMessage);
          if (res.phone) setPhone(res.phone);
        } else {
          toast.error(res.error || "Não foi possível carregar as mensagens.");
        }
      });
    }
  };

  const handleCopyInvite = async () => {
    try {
      await copyToClipboard(inviteMessage);
      setCopiedInvite(true);
      toast.success("Mensagem de convite copiada!");
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      toast.error("Erro ao copiar mensagem.");
    }
  };

  const handleCopySave = async () => {
    try {
      await copyToClipboard(saveContactMessage);
      setCopiedSave(true);
      toast.success("Mensagem para salvar contato copiada!");
      setTimeout(() => setCopiedSave(false), 2000);
    } catch {
      toast.error("Erro ao copiar mensagem.");
    }
  };

  const currentInviteUrl = buildWhatsAppShareUrl({
    phone,
    text: inviteMessage,
  });

  const currentSaveUrl = buildWhatsAppShareUrl({
    phone,
    text: saveContactMessage,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          aria-label="Enviar convite por WhatsApp"
        >
          <MessageSquareIcon className="size-3.5" />
          <span>WhatsApp</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <MessageSquareIcon className="size-4" />
            </span>
            <DialogTitle className="font-heading text-xl">
              Convite via WhatsApp
            </DialogTitle>
          </div>
          <DialogDescription>
            Envie mensagens prontas e personalizadas diretamente no WhatsApp de{" "}
            <strong>{name || email}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <RefreshCwIcon className="size-5 animate-spin text-primary" />
            <p className="text-xs">Carregando mensagens personalizadas...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Optional Phone Input to target direct WhatsApp chat */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                WhatsApp da pessoa (opcional para abrir direto no chat dela):
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 11988887777 (com DDD)"
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Tabs for Invite Message vs Save Contact Message */}
            <Tabs defaultValue="invite" className="space-y-3">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="invite" className="text-xs gap-1.5">
                  <UserCheckIcon className="size-3.5" />
                  Mensagem de Convite
                </TabsTrigger>
                <TabsTrigger value="save" className="text-xs gap-1.5">
                  <ShieldAlertIcon className="size-3.5 text-emerald-600" />
                  Salvar Contato
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Invite Message */}
              <TabsContent value="invite" className="space-y-3 mt-0">
                <div className="rounded-xl border bg-muted/40 p-3.5 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {inviteMessage || "Carregando..."}
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
                      href={currentInviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                      Abrir no WhatsApp
                    </a>
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 2: Save Contact Message */}
              <TabsContent value="save" className="space-y-3 mt-0">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldAlertIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Por que enviar isso?</strong> Quando o membro salva o número oficial da igreja na agenda do celular, o WhatsApp não bloqueia suas mensagens como spam nem suspende a linha.
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/40 p-3.5 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {saveContactMessage || "Carregando..."}
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
                      href={currentSaveUrl}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
