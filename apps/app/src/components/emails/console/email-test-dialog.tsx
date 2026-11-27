"use client";

import { RefreshCwIcon, SendIcon } from "lucide-react";

import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { TestEmailDialogState } from "./types";

type EmailTestDialogProps = {
  state: TestEmailDialogState;
  onOpenChange: (open: boolean) => void;
  onTargetEmailChange: (value: string) => void;
  onSubmit: () => void;
};

export function EmailTestDialog({
  state,
  onOpenChange,
  onTargetEmailChange,
  onSubmit,
}: EmailTestDialogProps) {
  return (
    <ResponsiveDialog
      open={state.open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <SendIcon className="size-4" />
          </span>
          <span>Enviar Email de Teste</span>
        </span>
      }
      description={state.templateName}
      contentClassName="sm:max-w-md"
      bodyClassName="space-y-4"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="min-h-11 text-xs sm:min-h-8"
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSubmit}
            disabled={state.loading}
            className="min-h-11 gap-1.5 text-xs sm:min-h-8"
          >
            {state.loading ? (
              <>
                <RefreshCwIcon className="size-3.5 animate-spin" />
                <span>Enviando via Brevo...</span>
              </>
            ) : (
              <>
                <SendIcon className="size-3.5" />
                <span>Enviar teste agora</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      <p className="text-xs text-muted-foreground leading-relaxed">
        O email será processado pelo Brevo e entregue diretamente na sua caixa
        de entrada para você avaliar o layout final.
      </p>

      <div className="space-y-1.5">
        <label
          htmlFor="test-email-target"
          className="text-xs font-semibold text-foreground"
        >
          Destinatário de teste
        </label>
        <Input
          id="test-email-target"
          type="email"
          placeholder="seu-email@exemplo.com"
          value={state.targetEmail}
          onChange={(e) => onTargetEmailChange(e.target.value)}
          className="h-11 text-xs sm:h-9"
        />
      </div>
    </ResponsiveDialog>
  );
}
