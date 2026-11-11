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
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
          title={`Enviar convite de ${departmentName} via WhatsApp para ${personName}`}
          aria-label="Avisar por WhatsApp"
        >
          <MessageSquareIcon className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <MessageSquareIcon className="size-4" />
            </span>
            <DialogTitle className="font-heading text-xl">
              Avisar via WhatsApp
            </DialogTitle>
          </div>
          <DialogDescription>
            Envie o convite de <strong>{departmentName}</strong> diretamente para{" "}
            <strong>{personName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <RefreshCwIcon className="size-5 animate-spin text-primary" />
            <p className="text-xs">Gerando mensagem personalizada...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                WhatsApp da pessoa (opcional para abrir direto no chat):
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 11988887777 (com DDD)"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="rounded-xl border bg-muted/40 p-3.5 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
              {message || "Carregando mensagem..."}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-xs"
              >
                {copied ? (
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
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  Abrir no WhatsApp
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
