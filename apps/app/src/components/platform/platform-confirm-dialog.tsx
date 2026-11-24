"use client";

import type { ReactNode } from "react";
import { Loader2Icon } from "lucide-react";

import { ResponsiveDialog } from "@/components/app/responsive-dialog";
import { Button } from "@/components/ui/button";

type PlatformConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function PlatformConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "destructive",
  pending = false,
  onConfirm,
}: PlatformConfirmDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      title={title}
      titleClassName="text-lg sm:text-xl"
      description={description}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            className="min-h-11 sm:min-h-9"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={pending}
            onClick={() => void onConfirm()}
            className="min-h-11 gap-2 sm:min-h-9"
          >
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm text-muted-foreground">
        Esta ação é registrada no log de auditoria da plataforma.
      </div>
    </ResponsiveDialog>
  );
}
