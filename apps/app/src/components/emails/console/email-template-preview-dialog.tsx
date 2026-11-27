"use client";

import {
  LaptopIcon,
  RefreshCwIcon,
  SendIcon,
  SmartphoneIcon,
} from "lucide-react";

import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { Button } from "@/components/ui/button";

import type { TemplatePreviewState } from "./types";

type EmailTemplatePreviewDialogProps = {
  preview: TemplatePreviewState;
  onOpenChange: (open: boolean) => void;
  onPreviewModeChange: (mode: "desktop" | "mobile") => void;
  onClose: () => void;
  onSendTest: () => void;
};

export function EmailTemplatePreviewDialog({
  preview,
  onOpenChange,
  onPreviewModeChange,
  onClose,
  onSendTest,
}: EmailTemplatePreviewDialogProps) {
  return (
    <ResponsiveDialog
      open={preview.open}
      onOpenChange={onOpenChange}
      title="Prévia do Modelo"
      description={preview.subject || "Carregando modelo..."}
      contentClassName="sm:max-w-3xl"
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
          {preview.templateKey ? (
            <Button
              variant="default"
              size="sm"
              onClick={onSendTest}
              className="min-h-11 gap-1.5 text-xs sm:min-h-8"
            >
              <SendIcon className="size-3.5" />
              <span>Enviar email de teste</span>
            </Button>
          ) : null}
        </div>
      }
    >
      {/* Desktop / Mobile Switcher */}
      <div className="flex justify-end">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
          <Button
            variant={preview.previewMode === "desktop" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => onPreviewModeChange("desktop")}
            title="Tamanho Desktop"
            className="min-h-11 min-w-11 sm:min-h-6 sm:min-w-6"
          >
            <LaptopIcon className="size-3.5" />
          </Button>
          <Button
            variant={preview.previewMode === "mobile" ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => onPreviewModeChange("mobile")}
            title="Tamanho Mobile"
            className="min-h-11 min-w-11 sm:min-h-6 sm:min-w-6"
          >
            <SmartphoneIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-105 flex-1 rounded-lg border bg-muted/20 flex items-center justify-center overflow-auto p-4">
        {preview.loading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCwIcon className="size-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              Renderizando modelo com React Email...
            </span>
          </div>
        ) : (
          <div
            className={`transition-all duration-200 h-full rounded-xl shadow-lg border overflow-hidden bg-white ${
              preview.previewMode === "mobile"
                ? "w-95 max-w-full"
                : "w-full max-w-155"
            }`}
          >
            <iframe
              title="Prévia do Modelo React Email"
              srcDoc={preview.html}
              className="w-full h-full min-h-115 border-0"
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
