"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  MessageSquareIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { getDepartmentWhatsAppInviteMessageAction } from "@/app/actions/departments";
import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyToClipboard } from "@/lib/clipboard";
import { buildWhatsAppShareUrl } from "@/lib/message-templates";

export function DepartmentWhatsAppInviteDialog({
  departmentId,
  departmentName,
  personId,
  personName,
}: {
  departmentId: string;
  departmentName: string;
  personId: string;
  personName: string;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !message) {
      startTransition(async () => {
        const res = await getDepartmentWhatsAppInviteMessageAction(
          departmentId,
          personId,
        );
        if (res.ok && res.message) {
          setMessage(res.message);
          if (res.phone) setPhone(res.phone);
        } else {
          toast.error(res.error || "Não foi possível carregar a mensagem.");
        }
      });
    }
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(message);
      setCopied(true);
      toast.success("Mensagem do departamento copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar mensagem.");
    }
  };

  const currentUrl = buildWhatsAppShareUrl({
    phone,
    text: message,
  });

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpen}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-emerald-600 max-sm:size-9 dark:hover:text-emerald-400"
          title={`Enviar convite de ${departmentName} via WhatsApp para ${personName}`}
          aria-label={`Avisar ${personName} por WhatsApp`}
        >
          <MessageSquareIcon className="size-3.5" />
        </Button>
      }
      title={
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <MessageSquareIcon className="size-4" />
          </span>
          Avisar via WhatsApp
        </span>
      }
      titleClassName="text-xl"
      description={
        <>
          Envie o convite de <strong className="text-foreground">{departmentName}</strong>{" "}
          diretamente para{" "}
          <strong className="text-foreground">{personName}</strong>.
        </>
      }
      contentClassName="sm:max-w-md"
    >
      {isPending ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <RefreshCwIcon className="size-5 animate-spin text-primary" />
          <p className="text-xs">Gerando mensagem personalizada...</p>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label
              htmlFor="whatsapp-invite-phone"
              className="text-xs font-medium text-muted-foreground"
            >
              WhatsApp da pessoa{" "}
              <span className="font-normal">
                (opcional, para abrir direto no chat)
              </span>
            </label>
            <Input
              id="whatsapp-invite-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ex: 11988887777 (com DDD)"
              className="h-10 bg-background text-sm"
            />
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border bg-muted/40 p-3.5 text-sm leading-relaxed whitespace-pre-wrap">
            {message || "Carregando mensagem..."}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="min-h-10 gap-1.5 text-xs"
            >
              {copied ? (
                <CheckIcon className="size-3.5 text-primary" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
              Copiar mensagem
            </Button>

            <Button
              type="button"
              size="sm"
              asChild
              className="min-h-10 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            >
              <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon className="size-3.5" />
                Abrir no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
