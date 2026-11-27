"use client";

import { MailIcon, RefreshCwIcon, ShieldAlertIcon } from "lucide-react";

import type { EmailLogItem } from "@/app/actions/emails";
import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { Button } from "@/components/ui/button";

import { formatEmailDate, formatTypeName } from "./email-format";

type EmailLogPreviewDialogProps = {
  log: EmailLogItem | null;
  isPending: boolean;
  onClose: () => void;
  onResend: (log: EmailLogItem) => void;
};

export function EmailLogPreviewDialog({
  log,
  isPending,
  onClose,
  onResend,
}: EmailLogPreviewDialogProps) {
  return (
    <ResponsiveDialog
      open={Boolean(log)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        <span className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MailIcon className="size-4" />
          </span>
          <span className="min-w-0 truncate">{log?.subject}</span>
        </span>
      }
      description={
        log ? `Para: ${log.recipientName} (${log.recipientEmail})` : undefined
      }
      contentClassName="sm:max-w-2xl"
      bodyClassName="space-y-3"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="min-h-11 text-xs sm:min-h-8"
          >
            Fechar
          </Button>
          {log ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onResend(log);
                onClose();
              }}
              disabled={isPending}
              className="min-h-11 gap-1.5 text-xs sm:min-h-8"
            >
              <RefreshCwIcon className="size-3.5" />
              <span>Reenviar agora</span>
            </Button>
          ) : null}
        </div>
      }
    >
      {log ? (
        <div className="flex min-h-0 flex-col space-y-3">
          {/* Metadados */}
          <div className="grid grid-cols-2 gap-2 text-[11px] rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground block">Tipo</span>
              <span className="font-medium capitalize">
                {formatTypeName(log.type)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Status</span>
              <span
                className={`font-semibold ${
                  log.status === "sent" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {log.status === "sent" ? "Enviado" : "Falhou"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Disparado em</span>
              <span className="font-medium">
                {formatEmailDate(log.createdAt)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">ID Brevo</span>
              <span
                className="font-mono text-[10px] truncate block"
                title={log.brevoMessageId || ""}
              >
                {log.brevoMessageId || "—"}
              </span>
            </div>
          </div>

          {log.lastError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
              <ShieldAlertIcon className="size-4 shrink-0 mt-0.5" />
              <span>{log.lastError}</span>
            </div>
          ) : null}

          {/* Sandboxed Iframe Preview */}
          <div className="min-h-87.5 flex-1 overflow-hidden rounded-lg border bg-white">
            <iframe
              title="Conteúdo do Email"
              srcDoc={log.htmlContent}
              className="w-full h-full min-h-87.5 border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}
